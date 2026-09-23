import 'server-only';
import type { BillingKind, DocumentKind, LineItemStatus } from '@/generated/prisma/client';
import { db } from '@/lib/db';
import { formatMoney, toDateInputValue } from './money';
import type { FeeRow } from '@/components/console/FeeEditor';
import { BILLING, COUNTED_STATUSES } from './fee-labels';

/**
 * The fee schedule a contract carries.
 *
 * A contract used to state its prices in free text, written by a person or by
 * the drafting assistant, which meant the price a client signed and the price
 * we then invoiced were two separate things that could quietly disagree. The
 * schedule is now generated from the project's fees at the moment the
 * document is sent, and written into the version the client signs, so the
 * fingerprint on the signature covers the exact amounts.
 *
 * An author places {{fees}} on its own line where the schedule belongs. With
 * no placeholder, a proposal, agreement, statement of work or change order
 * gets the schedule at the end anyway: fees are never left out.
 */

export const FEES_TOKEN = '{{fees}}';
const TOKEN_LINE = /^[ \t]*\{\{\s*fees\s*\}\}[ \t]*$/gm;

const CARRIES_FEES: DocumentKind[] = ['proposal', 'contract', 'statement_of_work', 'change_order'];

export function carriesFees(kind: DocumentKind): boolean {
  return CARRIES_FEES.includes(kind);
}

export type ScheduleLine = {
  label: string;
  description: string | null;
  billingKind: BillingKind;
  amountMinor: number;
  quantity: number;
  currency: string;
  terms: string | null;
};

/** Escapes what the renderer would read as markup, including table pipes. */
function cell(text: string): string {
  return text.replace(/([*_~`[\]\\|])/g, '\\$1').replace(/\s*\n\s*/g, ' ');
}

/**
 * The price cell for one fee, the same in both tables: the quantity when
 * there is more than one, so a signed contract states what is actually owed.
 */
function priceCell(line: ScheduleLine): string {
  if (line.amountMinor === 0) return 'To be confirmed';
  const billing = BILLING[line.billingKind];
  const each = formatMoney(line.amountMinor, line.currency);
  return line.quantity > 1 ? `${line.quantity} × ${each}${billing.per}` : `${each}${billing.per}`;
}

/** A fee that is part of the agreement but not charged for now. */
export type LaterLine = ScheduleLine & { status: LineItemStatus };

const LATER_LABEL: Partial<Record<LineItemStatus, string>> = {
  deferred: 'Later',
  paused: 'Paused',
  waived: 'Waived',
};

/**
 * The table and totals, without a heading. withFees decides on the heading.
 *
 * Fees agreed but not charged for now (deferred, paused, waived) follow in a
 * table of their own, so the client sees them and why, and they never count
 * towards a total. With none, the output is exactly what it always was.
 */
export function feeSchedule(
  lines: ScheduleLine[],
  currency: string,
  /** Basis points of VAT added on invoices, when the company charges it. */
  vatBps = 0,
  later: LaterLine[] = [],
): string {
  const notNow = laterSchedule(later);
  if (lines.length === 0) {
    // With fees agreed for later, "no fees have been set" would contradict
    // the table right under it.
    return notNow ? `Nothing is charged for now.\n\n${notNow}` : 'No fees have been set for this work yet.';
  }

  const withTerms = lines.some((line) => line.terms?.trim());
  const head = withTerms
    ? '| Item | Billing | Amount | Terms |\n| --- | --- | --- | --- |'
    : '| Item | Billing | Amount |\n| --- | --- | --- |';

  const rows = lines.map((line) => {
    const item = line.description ? `${line.label}: ${line.description}` : line.label;
    const cells = [cell(item), BILLING[line.billingKind].label, priceCell(line)];
    if (withTerms) cells.push(cell(line.terms ?? ''));
    return `| ${cells.join(' | ')} |`;
  });

  const once = lines
    .filter((line) => line.billingKind === 'one_off' || line.billingKind === 'installment')
    .reduce((sum, line) => sum + line.amountMinor * line.quantity, 0);
  const monthly = lines
    .filter((line) => line.billingKind === 'recurring_monthly')
    .reduce((sum, line) => sum + line.amountMinor * line.quantity, 0);
  const yearly = lines
    .filter((line) => line.billingKind === 'recurring_annual')
    .reduce((sum, line) => sum + line.amountMinor * line.quantity, 0);

  const totals = [
    once > 0 ? `**Total one-off: ${formatMoney(once, currency)}**` : null,
    monthly > 0 ? `Then ${formatMoney(monthly, currency)} a month.` : null,
    yearly > 0 ? `Then ${formatMoney(yearly, currency)} a year.` : null,
  ].filter(Boolean);

  const vat =
    vatBps > 0 ? [`Prices exclude VAT at ${(vatBps / 100).toString()}%, which is added to each invoice.`] : [];

  const schedule = [head, ...rows, '', ...totals.map((line) => `${line}\n`), ...vat]
    .join('\n')
    .trimEnd();
  return notNow ? `${schedule}\n\n${notNow}` : schedule;
}

function laterSchedule(later: LaterLine[]): string {
  if (later.length === 0) return '';
  const withTerms = later.some((line) => line.terms?.trim());
  const head = withTerms
    ? '| Not charged for now | Status | Price | Terms |\n| --- | --- | --- | --- |'
    : '| Not charged for now | Status | Price |\n| --- | --- | --- |';
  const rows = later.map((line) => {
    const item = line.description ? `${line.label}: ${line.description}` : line.label;
    const cells = [cell(item), LATER_LABEL[line.status] ?? line.status, priceCell(line)];
    if (withTerms) cells.push(cell(line.terms ?? ''));
    return `| ${cells.join(' | ')} |`;
  });
  return [head, ...rows].join('\n');
}

const HEADING = /^#{1,3}[ \t]+\S/;

/**
 * The author's text with the schedule in it: at the placeholder, or appended
 * when the document is one that must carry fees. Only the first placeholder
 * is filled; any others are removed rather than left as stray braces. A
 * placeholder that sits under the author's own heading ("## Investment") keeps
 * that heading; one that does not gets "## Fees".
 */
export function withFees(source: string, schedule: string, kind: DocumentKind): string {
  let placed = false;
  const filled = source.replace(TOKEN_LINE, (_match, offset: number) => {
    if (placed) return '';
    placed = true;
    const before = source.slice(0, offset).trimEnd().split('\n').pop() ?? '';
    return HEADING.test(before) ? schedule : `## Fees\n\n${schedule}`;
  });
  if (placed || !carriesFees(kind)) return filled.replace(/\n{3,}/g, '\n\n');
  return `${source.trimEnd()}\n\n## Fees\n\n${schedule}`;
}

/** True when the author has said where the fee table goes. */
export function hasFeesToken(source: string): boolean {
  return new RegExp(TOKEN_LINE.source, 'm').test(source);
}

/** Fees agreed but not charged for now: deferred, paused or waived. */
export async function projectFeesLater(projectId: string): Promise<LaterLine[]> {
  return db.lineItem.findMany({
    where: { projectId, status: { in: ['deferred', 'paused', 'waived'] } },
    orderBy: { position: 'asc' },
    select: {
      label: true,
      description: true,
      billingKind: true,
      amountMinor: true,
      quantity: true,
      currency: true,
      terms: true,
      status: true,
    },
  });
}

/** The project's counted fees, in order. */
export async function projectFees(projectId: string) {
  return db.lineItem.findMany({
    where: { projectId, status: { in: COUNTED_STATUSES } },
    orderBy: { position: 'asc' },
    select: {
      id: true,
      label: true,
      description: true,
      billingKind: true,
      amountMinor: true,
      quantity: true,
      currency: true,
      terms: true,
    },
  });
}

/** Problems that stop a fee schedule going out, in plain words. */
export function feeProblems(
  lines: ScheduleLine[],
  currency: string,
  kind?: DocumentKind,
  /** How many fees are agreed but not charged for now. */
  laterCount = 0,
): string[] {
  const problems: string[] = [];
  // A change order can genuinely cost nothing. A proposal or agreement with no
  // fees on it is a document sent too early.
  if (lines.length === 0 && kind && kind !== 'change_order' && carriesFees(kind)) {
    problems.push(
      laterCount > 0
        ? 'Nothing would be charged: every fee is deferred, paused or waived.'
        : 'No fees have been added yet.',
    );
  }
  const unpriced = lines.filter((line) => line.amountMinor === 0).length;
  if (unpriced > 0) {
    problems.push(`${unpriced} fee${unpriced === 1 ? ' has' : 's have'} no price yet.`);
  }
  const currencies = [...new Set(lines.map((line) => line.currency))];
  if (currencies.length > 1 || (currencies[0] && currencies[0] !== currency)) {
    problems.push(`Fees must all be in ${currency}.`);
  }
  return problems;
}

/** The project's fees as the fee editor shows them, removed ones left out. */
export async function editableFees(projectId: string): Promise<FeeRow[]> {
  const lines = await db.lineItem.findMany({
    where: { projectId, status: { not: 'cancelled' } },
    orderBy: { position: 'asc' },
    select: {
      id: true,
      label: true,
      description: true,
      billingKind: true,
      amountMinor: true,
      quantity: true,
      terms: true,
      nextDueAt: true,
      status: true,
      _count: { select: { invoiceLines: true } },
    },
  });
  return lines.map((line) => ({
    id: line.id,
    label: line.label,
    description: line.description,
    billingKind: line.billingKind,
    amountMinor: line.amountMinor,
    quantity: line.quantity,
    terms: line.terms,
    nextDueAt: toDateInputValue(line.nextDueAt),
    status: line.status,
    invoiced: line._count.invoiceLines > 0,
  }));
}
