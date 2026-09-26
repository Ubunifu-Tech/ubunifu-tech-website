import 'server-only';
import { db } from '@/lib/db';
import type { CostCategory, ServiceLine } from '@/generated/prisma/client';
import { countedPayment, liveInvoice, renewingLine } from './live';
import { formatMoney, minorUnitScale } from './money';
import { INVOICE_AHEAD_DAYS, ensureRenewalEvents } from './renewals';

/**
 * The money reports: what came in, what went out, and what is still to come.
 *
 * Cash, not promises. Money in is payments received less refunds sent back,
 * plus other income typed in, such as a product's own sales, on the day each
 * happened; money out is the costs typed in from bills. What
 * was invoiced is shown beside them but never counted as income, because an
 * invoice asks for money and is not money.
 *
 * Amounts stay in the currency they happened in. A combined total converts
 * them with the rate typed in for each month, and a month without its rate
 * says so rather than guessing. Nothing billed is ever converted: this is for
 * reading the business, not for charging anyone.
 */

export const PERIODS = [
  { key: 'this-month', label: 'This month' },
  { key: 'last-month', label: 'Last month' },
  { key: 'this-quarter', label: 'This quarter' },
  { key: 'this-year', label: 'This year' },
  { key: 'last-12', label: 'Last 12 months' },
  { key: 'last-year', label: 'Last year' },
] as const;

export type PeriodKey = (typeof PERIODS)[number]['key'];

export type Period = {
  key: PeriodKey;
  label: string;
  /** Inclusive. */
  from: Date;
  /** Exclusive. */
  to: Date;
  /** "2026-09", in order, up to the current month. */
  months: string[];
};

const monthStart = (year: number, month: number) => new Date(Date.UTC(year, month, 1));

export const monthKey = (date: Date) => date.toISOString().slice(0, 7);

export const monthDate = (key: string) => new Date(`${key}-01T00:00:00.000Z`);

/** "Sept 2026". */
export function monthLabel(key: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(monthDate(key));
}

export function periodFor(key: string | undefined, now: Date): Period {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const known = PERIODS.find((period) => period.key === key) ?? PERIODS[3];
  let from: Date;
  let to: Date;
  switch (known.key) {
    case 'this-month':
      from = monthStart(year, month);
      to = monthStart(year, month + 1);
      break;
    case 'last-month':
      from = monthStart(year, month - 1);
      to = monthStart(year, month);
      break;
    case 'this-quarter': {
      const first = Math.floor(month / 3) * 3;
      from = monthStart(year, first);
      to = monthStart(year, first + 3);
      break;
    }
    case 'last-12':
      from = monthStart(year, month - 11);
      to = monthStart(year, month + 1);
      break;
    case 'last-year':
      from = monthStart(year - 1, 0);
      to = monthStart(year, 0);
      break;
    default:
      from = monthStart(year, 0);
      to = monthStart(year + 1, 0);
  }

  // Months still to come are left off the table: a row of zeros for November
  // says nothing in September.
  const last = monthStart(year, month + 1);
  const months: string[] = [];
  for (
    let cursor = from;
    cursor < to && cursor < last;
    cursor = monthStart(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1)
  ) {
    months.push(monthKey(cursor));
  }
  return { key: known.key, label: known.label, from, to, months };
}

// ── Lines ────────────────────────────────────────────────────────────────

export type Money = { month: string; currency: string; amountMinor: number };

type Party = { id: string; name: string; removed: boolean } | null;
type Work = { name: string; serviceLine: ServiceLine } | null;
type Made = { id: string; name: string } | null;

export type Line = Money & {
  /** Received and income are money in; refunded and cost are money out. */
  kind: 'received' | 'refunded' | 'cost' | 'invoiced' | 'income';
  on: Date;
  /**
   * Receipt, refund note or invoice number, who a cost was paid to, or where
   * other income came from.
   */
  reference: string;
  client: Party;
  project: Work;
  /** The product the money belongs to: its own, or its project's. */
  product: Made;
  category: CostCategory | null;
  /** VAT on an invoice. */
  taxMinor: number;
};

const party = (client: { id: string; name: string; deletedAt: Date | null } | null): Party =>
  client ? { id: client.id, name: client.name, removed: client.deletedAt !== null } : null;

const PARTY = { select: { id: true, name: true, deletedAt: true } } as const;
const MADE = { select: { id: true, name: true } } as const;
const WORK = { select: { name: true, serviceLine: true, product: MADE } } as const;

const work = (project: { name: string; serviceLine: ServiceLine } | null): Work =>
  project ? { name: project.name, serviceLine: project.serviceLine } : null;

/** Everything that moved money in the period, as one list. */
export async function ledger(period: Period): Promise<Line[]> {
  const between = { gte: period.from, lt: period.to };
  const [payments, refunds, costs, invoices, income] = await Promise.all([
    db.payment.findMany({
      where: { ...countedPayment, receivedAt: between },
      select: {
        amountMinor: true,
        currency: true,
        receivedAt: true,
        receipt: { select: { number: true } },
        invoice: { select: { number: true, client: PARTY, project: WORK } },
      },
    }),
    db.refund.findMany({
      where: { refundedAt: between, cancelledAt: null, payment: countedPayment },
      select: {
        number: true,
        amountMinor: true,
        currency: true,
        refundedAt: true,
        payment: { select: { invoice: { select: { client: PARTY, project: WORK } } } },
      },
    }),
    db.cost.findMany({
      where: { incurredOn: between },
      select: {
        vendor: true,
        category: true,
        amountMinor: true,
        currency: true,
        incurredOn: true,
        client: PARTY,
        project: WORK,
        product: MADE,
      },
    }),
    db.invoice.findMany({
      where: { ...liveInvoice, status: { notIn: ['draft', 'void'] }, issuedAt: between },
      select: {
        number: true,
        totalMinor: true,
        taxMinor: true,
        currency: true,
        issuedAt: true,
        client: PARTY,
        project: WORK,
      },
    }),
    db.income.findMany({
      where: { receivedOn: between },
      select: {
        source: true,
        amountMinor: true,
        currency: true,
        receivedOn: true,
        product: MADE,
      },
    }),
  ]);

  return [
    ...payments.map((payment) => ({
      kind: 'received' as const,
      on: payment.receivedAt,
      month: monthKey(payment.receivedAt),
      currency: payment.currency,
      amountMinor: payment.amountMinor,
      reference: payment.receipt?.number ?? payment.invoice.number,
      client: party(payment.invoice.client),
      project: work(payment.invoice.project),
      product: payment.invoice.project?.product ?? null,
      category: null,
      taxMinor: 0,
    })),
    ...refunds.map((refund) => ({
      kind: 'refunded' as const,
      on: refund.refundedAt,
      month: monthKey(refund.refundedAt),
      currency: refund.currency,
      amountMinor: refund.amountMinor,
      reference: refund.number,
      client: party(refund.payment.invoice.client),
      project: work(refund.payment.invoice.project),
      product: refund.payment.invoice.project?.product ?? null,
      category: null,
      taxMinor: 0,
    })),
    ...costs.map((cost) => ({
      kind: 'cost' as const,
      on: cost.incurredOn,
      month: monthKey(cost.incurredOn),
      currency: cost.currency,
      amountMinor: cost.amountMinor,
      reference: cost.vendor,
      client: party(cost.client),
      project: work(cost.project),
      product: cost.product ?? cost.project?.product ?? null,
      category: cost.category,
      taxMinor: 0,
    })),
    ...invoices.flatMap((invoice) =>
      invoice.issuedAt
        ? [
            {
              kind: 'invoiced' as const,
              on: invoice.issuedAt,
              month: monthKey(invoice.issuedAt),
              currency: invoice.currency,
              amountMinor: invoice.totalMinor,
              reference: invoice.number,
              client: party(invoice.client),
              project: work(invoice.project),
              product: invoice.project?.product ?? null,
              category: null,
              taxMinor: invoice.taxMinor,
            },
          ]
        : [],
    ),
    ...income.map((entry) => ({
      kind: 'income' as const,
      on: entry.receivedOn,
      month: monthKey(entry.receivedOn),
      currency: entry.currency,
      amountMinor: entry.amountMinor,
      reference: entry.source,
      client: null,
      project: null,
      product: entry.product,
      category: null,
      taxMinor: 0,
    })),
  ].sort((a, b) => a.on.getTime() - b.on.getTime());
}

// ── Currencies ───────────────────────────────────────────────────────────

/**
 * Most valuable first, so a rate reads the way people say it: 1 US$ is
 * 2,450 TZS, not 0.0004 US$ to the shilling.
 */
const BY_VALUE = ['GBP', 'EUR', 'USD', 'KES', 'TZS'];

export function ratePair(a: string, b: string): { base: string; quote: string } {
  const ia = BY_VALUE.indexOf(a);
  const ib = BY_VALUE.indexOf(b);
  const aFirst = ia === -1 && ib === -1 ? a < b : ia === -1 ? false : ib === -1 ? true : ia < ib;
  return aFirst ? { base: a, quote: b } : { base: b, quote: a };
}

export type Rates = Map<string, number>;

const rateKey = (month: string, base: string, quote: string) => `${month}|${base}|${quote}`;

export async function ratesFor(months: string[]): Promise<Rates> {
  if (months.length === 0) return new Map();
  const rows = await db.exchangeRate.findMany({
    where: { month: { in: months.map(monthDate) } },
    select: { month: true, base: true, quote: true, rate: true },
  });
  return new Map(
    rows.map((row) => [rateKey(monthKey(row.month), row.base, row.quote), row.rate.toNumber()]),
  );
}

export function rateOf(rates: Rates, month: string, base: string, quote: string): number | null {
  return rates.get(rateKey(month, base, quote)) ?? null;
}

/** An amount in another currency at its month's rate, or null without one. */
export function convert(money: Money, to: string, rates: Rates): number | null {
  if (money.currency === to) return money.amountMinor;
  const { base, quote } = ratePair(money.currency, to);
  const rate = rateOf(rates, money.month, base, quote);
  if (!rate) return null;
  const units = money.amountMinor / 10 ** minorUnitScale(money.currency);
  const converted = money.currency === base ? units * rate : units / rate;
  return Math.round(converted * 10 ** minorUnitScale(to));
}

/**
 * How amounts are read: everything in one currency, converted where needed,
 * or one currency's own amounts and nothing else.
 */
export type View = { kind: 'all' | 'only'; currency: string };

export function viewsFor(currencies: string[]): { key: string; label: string; view: View }[] {
  return [
    ...currencies.map((currency) => ({
      key: currency,
      label: `All in ${currency}`,
      view: { kind: 'all' as const, currency },
    })),
    ...currencies.map((currency) => ({
      key: `only-${currency}`,
      label: `${currency} only`,
      view: { kind: 'only' as const, currency },
    })),
  ];
}

/**
 * Adds amounts up in a view, noting every month and currency that could not
 * be converted for want of a rate, so the page can ask for exactly those.
 */
export function tally(view: View, rates: Rates) {
  const missing = new Map<string, { month: string; base: string; quote: string }>();
  const value = (money: Money): number | null => {
    if (view.kind === 'only') return money.currency === view.currency ? money.amountMinor : 0;
    const converted = convert(money, view.currency, rates);
    if (converted === null) {
      const { base, quote } = ratePair(money.currency, view.currency);
      missing.set(rateKey(money.month, base, quote), { month: money.month, base, quote });
    }
    return converted;
  };
  const sum = (items: Money[]): { total: number; complete: boolean } => {
    let total = 0;
    let complete = true;
    for (const item of items) {
      const amount = value(item);
      if (amount === null) complete = false;
      else total += amount;
    }
    return { total, complete };
  };
  return { sum, missing };
}

/** Amounts in several currencies, side by side and never added together. */
export function sideBySide(byCurrency: Map<string, number>): string {
  const parts = [...byCurrency].filter(([, amount]) => amount !== 0);
  return parts.length === 0
    ? 'Nothing'
    : parts.map(([currency, amount]) => formatMoney(amount, currency)).join(' + ');
}

export function addTo(map: Map<string, number>, currency: string, amount: number) {
  map.set(currency, (map.get(currency) ?? 0) + amount);
}

// ── Still to come ────────────────────────────────────────────────────────

const DAY = 86_400_000;

export type Owing = {
  number: string;
  client: string;
  clientSlug: string;
  currency: string;
  outstandingMinor: number;
  dueAt: Date | null;
  /** Days past its due date; 0 or less is not late yet. */
  daysLate: number;
};

/**
 * What is owed and what is about to be, as of today: sent invoices not paid,
 * renewals close enough to invoice, and agreed fees nobody has invoiced yet.
 * Each in the currency it is in; nothing here is converted.
 */
export async function comingIn(now: Date) {
  await ensureRenewalEvents();
  const soon = new Date(now.getTime() + INVOICE_AHEAD_DAYS * DAY);

  const [invoices, renewals, agreedLines, proposalLines] = await Promise.all([
    db.invoice.findMany({
      where: { ...liveInvoice, status: { in: ['sent', 'part_paid', 'overdue'] } },
      orderBy: [{ dueAt: { sort: 'asc', nulls: 'last' } }, { issuedAt: 'asc' }],
      select: {
        number: true,
        currency: true,
        totalMinor: true,
        paidMinor: true,
        dueAt: true,
        client: { select: { name: true, slug: true } },
      },
    }),
    db.renewalEvent.findMany({
      where: { status: 'pending', dueAt: { lte: soon }, lineItem: renewingLine },
      select: {
        lineItem: { select: { amountMinor: true, quantity: true, currency: true } },
      },
    }),
    // Agreed means past the proposal: the client has said yes to these.
    db.lineItem.findMany({
      where: {
        billingKind: { in: ['one_off', 'installment'] },
        status: { in: ['planned', 'active'] },
        amountMinor: { gt: 0 },
        project: {
          deletedAt: null,
          status: { notIn: ['lead', 'proposal_draft', 'proposal_sent', 'closed', 'cancelled'] },
        },
      },
      select: {
        amountMinor: true,
        quantity: true,
        currency: true,
        invoiceLines: {
          where: { invoice: { status: { not: 'void' } } },
          select: { amountMinor: true, quantity: true },
        },
        project: {
          select: {
            name: true,
            slug: true,
            reference: true,
            client: { select: { name: true } },
          },
        },
      },
    }),
    db.lineItem.findMany({
      where: {
        billingKind: { in: ['one_off', 'installment'] },
        status: { in: ['planned', 'active'] },
        amountMinor: { gt: 0 },
        project: { deletedAt: null, status: { in: ['lead', 'proposal_draft', 'proposal_sent'] } },
      },
      select: { amountMinor: true, quantity: true, currency: true },
    }),
  ]);

  const owing: Owing[] = invoices.flatMap((invoice) => {
    const outstandingMinor = invoice.totalMinor - invoice.paidMinor;
    if (outstandingMinor <= 0) return [];
    return [
      {
        number: invoice.number,
        client: invoice.client.name,
        clientSlug: invoice.client.slug,
        currency: invoice.currency,
        outstandingMinor,
        dueAt: invoice.dueAt,
        daysLate: invoice.dueAt ? Math.floor((now.getTime() - invoice.dueAt.getTime()) / DAY) : 0,
      },
    ];
  });

  const bucket = (test: (invoice: Owing) => boolean) => {
    const byCurrency = new Map<string, number>();
    const list = owing.filter(test);
    for (const invoice of list) addTo(byCurrency, invoice.currency, invoice.outstandingMinor);
    return { count: list.length, byCurrency };
  };

  const renewalsDue = new Map<string, number>();
  for (const renewal of renewals) {
    addTo(renewalsDue, renewal.lineItem.currency, renewal.lineItem.amountMinor * renewal.lineItem.quantity);
  }

  const byProject = new Map<
    string,
    { name: string; slug: string; reference: string | null; client: string; currency: string; minor: number }
  >();
  const agreed = new Map<string, number>();
  for (const line of agreedLines) {
    const invoiced = line.invoiceLines.reduce((t, l) => t + l.amountMinor * l.quantity, 0);
    const remaining = line.amountMinor * line.quantity - invoiced;
    if (remaining <= 0) continue;
    addTo(agreed, line.currency, remaining);
    const key = `${line.project.slug}|${line.currency}`;
    const entry = byProject.get(key) ?? {
      name: line.project.name,
      slug: line.project.slug,
      reference: line.project.reference,
      client: line.project.client.name,
      currency: line.currency,
      minor: 0,
    };
    entry.minor += remaining;
    byProject.set(key, entry);
  }

  const inProposals = new Map<string, number>();
  for (const line of proposalLines) addTo(inProposals, line.currency, line.amountMinor * line.quantity);

  return {
    owing,
    overdue: bucket((invoice) => invoice.dueAt !== null && invoice.daysLate > 0),
    late30: bucket((invoice) => invoice.dueAt !== null && invoice.daysLate > 0 && invoice.daysLate <= 30),
    late60: bucket((invoice) => invoice.daysLate > 30 && invoice.daysLate <= 60),
    lateMore: bucket((invoice) => invoice.daysLate > 60),
    dueSoon: bucket(
      (invoice) =>
        invoice.dueAt !== null &&
        invoice.daysLate <= 0 &&
        invoice.dueAt.getTime() <= now.getTime() + 30 * DAY,
    ),
    renewals: { count: renewals.length, byCurrency: renewalsDue },
    agreed,
    agreedProjects: [...byProject.values()].sort((a, b) => b.minor - a.minor),
    inProposals,
  };
}
