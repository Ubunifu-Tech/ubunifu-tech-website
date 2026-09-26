import Link from 'next/link';
import { db } from '@/lib/db';
import { can, requirePermission } from '@/lib/console/auth';
import { formatMoney, formatShortDate } from '@/lib/console/money';
import { SERVICE_LABEL } from '@/lib/console/project-status';
import { COST_CATEGORY_LABEL } from '@/lib/console/cost-labels';
import {
  PERIODS,
  comingIn,
  ledger,
  monthLabel,
  periodFor,
  rateOf,
  ratePair,
  ratesFor,
  sideBySide,
  tally,
  viewsFor,
  type Line,
  type Money,
} from '@/lib/console/finance';
import { Callout } from '@/components/console/Callout';
import { Figures } from '@/components/console/Figures';
import { RateForm } from './RateForm';
import finance from './Finance.module.css';
import styles from '../Admin.module.css';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';
import { INVOICE_AHEAD_DAYS } from '@/lib/console/renewals';

export const metadata = { title: 'Reports' };

/** The currencies in the reports, shillings first. */
function ordered(currencies: string[]): string[] {
  const order = ['TZS', 'USD', 'EUR', 'GBP', 'KES'];
  return [...new Set(currencies)].sort((a, b) => {
    const ia = order.indexOf(a) === -1 ? 99 : order.indexOf(a);
    const ib = order.indexOf(b) === -1 ? 99 : order.indexOf(b);
    return ia - ib || a.localeCompare(b);
  });
}

type Sum = { total: number; complete: boolean };

/** The first amount, less the others. */
const less = (first: Sum, ...rest: Sum[]): Sum => ({
  total: rest.reduce((total, sum) => total - sum.total, first.total),
  complete: [first, ...rest].every((sum) => sum.complete),
});

/**
 * How the business is doing: money in and out over a period, where it came
 * from and went, and what is still to come in.
 */
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; in?: string }>;
}) {
  const staff = await requirePermission('finance');
  // Links go only where this person may follow them.
  const mayInvoices = can(staff, 'invoices');
  const mayFees = mayInvoices || can(staff, 'fees');
  const params = await searchParams;
  const now = new Date();
  const period = periodFor(params.period, now);
  const [lines, coming, rates, products] = await Promise.all([
    ledger(period),
    comingIn(now),
    ratesFor(period.months),
    db.product.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, isActive: true } }),
  ]);

  const currencies = ordered([
    'TZS',
    'USD',
    ...lines.map((line) => line.currency),
    ...coming.owing.map((invoice) => invoice.currency),
  ]);
  const views = viewsFor(currencies);
  const chosen = views.find((option) => option.key === params.in) ?? views[0]!;
  const { view } = chosen;
  const { sum, missing } = tally(view, rates);

  const of = (kind: Line['kind'], rows: Line[] = lines) => rows.filter((line) => line.kind === kind);
  const negative = (rows: Line[]): Money[] => rows.map((line) => ({ ...line, amountMinor: -line.amountMinor }));

  /** Money that came in: payments and other income, less refunds. */
  const inOf = (rows: Line[]) =>
    sum([...of('received', rows), ...of('income', rows), ...negative(of('refunded', rows))]);

  const otherIncome = sum(of('income'));
  const refunded = sum(of('refunded'));
  const spent = sum(of('cost'));
  const invoiced = sum(of('invoiced'));
  const vat = sum(of('invoiced').map((line) => ({ ...line, amountMinor: line.taxMinor })));
  const moneyIn = inOf(lines);
  const left = less(moneyIn, spent);

  const shown = (value: Sum) =>
    value.complete ? formatMoney(value.total, view.currency) : 'Needs a rate';
  const cell = (value: Sum) =>
    !value.complete ? (
      <a href="#rates" className={finance.needsRate}>
        Needs a rate
      </a>
    ) : value.total === 0 ? (
      <span className={table.muted}>{formatMoney(0, view.currency)}</span>
    ) : (
      formatMoney(value.total, view.currency)
    );

  // ── Month by month ─────────────────────────────────────────────────────
  const months = period.months.map((month) => {
    const inMonth = lines.filter((line) => line.month === month);
    const monthIn = inOf(inMonth);
    const monthOut = sum(of('cost', inMonth));
    return {
      month,
      invoiced: sum(of('invoiced', inMonth)),
      moneyIn: monthIn,
      moneyOut: monthOut,
      left: less(monthIn, monthOut),
    };
  });

  // ── By client ──────────────────────────────────────────────────────────
  const clients = new Map<
    string,
    { name: string; removed: boolean; incoming: Money[]; outgoing: Money[] }
  >();
  for (const line of lines) {
    if (line.kind === 'invoiced') continue;
    const key = line.kind === 'income' ? 'income' : (line.client?.id ?? 'none');
    const row = clients.get(key) ?? {
      name:
        line.kind === 'income' ? 'Other income' : (line.client?.name ?? 'Not for one client'),
      removed: line.client?.removed ?? false,
      incoming: [],
      outgoing: [],
    };
    if (line.kind === 'received' || line.kind === 'income') row.incoming.push(line);
    if (line.kind === 'refunded') row.incoming.push(...negative([line]));
    if (line.kind === 'cost') row.outgoing.push(line);
    clients.set(key, row);
  }
  const byClient = [...clients.entries()]
    .map(([key, row]) => {
      const incoming = sum(row.incoming);
      const outgoing = sum(row.outgoing);
      return { key, ...row, incoming, outgoing, left: less(incoming, outgoing) };
    })
    .sort((a, b) => b.incoming.total - a.incoming.total || b.outgoing.total - a.outgoing.total);

  // ── By service ─────────────────────────────────────────────────────────
  const services = new Map<string, Money[]>();
  for (const line of lines) {
    if (line.kind !== 'received' && line.kind !== 'refunded' && line.kind !== 'income') continue;
    const key = line.kind === 'income' ? 'income' : (line.project?.serviceLine ?? 'none');
    const list = services.get(key) ?? [];
    list.push(...(line.kind === 'refunded' ? negative([line]) : [line]));
    services.set(key, list);
  }
  const byService = [...services.entries()]
    .map(([key, list]) => ({
      key,
      label:
        key === 'none'
          ? 'Not on a project'
          : key === 'income'
            ? 'Other income'
            : (SERVICE_LABEL[key] ?? key),
      amount: sum(list),
    }))
    .sort((a, b) => b.amount.total - a.amount.total);

  // ── By product ─────────────────────────────────────────────────────────
  // Every product we make, with anything that has money against it even if
  // it has since been stopped.
  const byProduct = products
    .map((product) => {
      const mine = lines.filter((line) => line.product?.id === product.id);
      const incoming = inOf(mine);
      const outgoing = sum(of('cost', mine));
      return { ...product, lines: mine.length, incoming, outgoing, left: less(incoming, outgoing) };
    })
    .filter((product) => product.isActive || product.lines > 0);

  // ── Costs by category ──────────────────────────────────────────────────
  const categories = new Map<string, Money[]>();
  for (const line of of('cost')) {
    const key = line.category ?? 'other';
    categories.set(key, [...(categories.get(key) ?? []), line]);
  }
  const byCategory = [...categories.entries()]
    .map(([key, list]) => ({ key, label: COST_CATEGORY_LABEL[key] ?? key, amount: sum(list) }))
    .sort((a, b) => b.amount.total - a.amount.total);

  const share = (part: Sum, whole: Sum) =>
    part.complete && whole.complete && whole.total > 0
      ? `${Math.round((part.total / whole.total) * 100)}%`
      : '';

  // ── Rates for a combined view: every month and currency that needs one ─
  const needed = new Map<string, { month: string; base: string; quote: string }>();
  if (view.kind === 'all') {
    for (const line of lines) {
      if (line.currency === view.currency) continue;
      const pair = ratePair(line.currency, view.currency);
      needed.set(`${line.month}|${pair.base}|${pair.quote}`, { month: line.month, ...pair });
    }
  }
  const rateRows = [...needed.values()].sort(
    (a, b) => a.month.localeCompare(b.month) || a.base.localeCompare(b.base),
  );
  const missingMonths = [...new Set([...missing.values()].map((entry) => entry.month))];

  // ── Still to come ──────────────────────────────────────────────────────
  const pick = (byCurrency: Map<string, number>) =>
    view.kind === 'only'
      ? new Map([...byCurrency].filter(([currency]) => currency === view.currency))
      : byCurrency;
  const owing = coming.owing.filter(
    (invoice) => view.kind === 'all' || invoice.currency === view.currency,
  );
  const agreedProjects = coming.agreedProjects.filter(
    (project) => view.kind === 'all' || project.currency === view.currency,
  );

  const href = (next: { period?: string; in?: string }) => {
    const query = new URLSearchParams();
    const periodKey = next.period ?? period.key;
    const viewKey = next.in ?? chosen.key;
    if (periodKey !== 'this-year') query.set('period', periodKey);
    if (viewKey !== views[0]!.key) query.set('in', viewKey);
    const search = query.toString();
    return search ? `/finance?${search}` : '/finance';
  };

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <h1 className={styles.heading}>
            How the business <span className={styles.headingAccent}>is doing</span>
          </h1>
          <p className={styles.lead}>
            {period.months.length > 0
              ? `${period.label}, ${monthLabel(period.months[0]!)}${
                  period.months.length > 1
                    ? ` to ${monthLabel(period.months[period.months.length - 1]!)}`
                    : ''
                }.`
              : period.label}
          </p>
        </div>
        <div className={styles.headActions}>
          <Link href="/finance/costs" className={`${forms.button} ${forms.quiet}`}>
            Add costs
          </Link>
          <a href={`/finance/export?period=${period.key}`} className={`${forms.button} ${forms.quiet}`}>
            Download as CSV
          </a>
        </div>
      </div>

      <div className={finance.switches}>
        <nav className={table.views} aria-label="Period">
          {PERIODS.map((option) => (
            <Link
              key={option.key}
              href={href({ period: option.key })}
              className={table.view}
              aria-current={option.key === period.key ? 'page' : undefined}
            >
              {option.label}
            </Link>
          ))}
        </nav>
        <nav className={table.views} aria-label="Currency">
          {views.map((option) => (
            <Link
              key={option.key}
              href={href({ in: option.key })}
              className={table.view}
              aria-current={option.key === chosen.key ? 'page' : undefined}
            >
              {option.label}
            </Link>
          ))}
        </nav>
      </div>

      {missingMonths.length > 0 && (
        <Callout
          kind="warn"
          action={
            <a href="#rates" className={table.action}>
              Add the rates
            </a>
          }
        >
          {missingMonths.length === 1
            ? `${monthLabel(missingMonths[0]!)} needs an exchange rate before its totals add up in ${view.currency}.`
            : `${missingMonths.length} months need an exchange rate before their totals add up in ${view.currency}.`}
        </Callout>
      )}

      <Figures
        label="The period"
        items={[
          {
            label: 'Money in',
            value: shown(moneyIn),
            note:
              !refunded.complete || !otherIncome.complete
                ? 'Payments and other income, less refunds'
                : [
                    otherIncome.total !== 0
                      ? `Payments and ${shown(otherIncome)} other income`
                      : 'Payments received',
                    refunded.total !== 0 ? `less ${shown(refunded)} refunded` : '',
                  ]
                    .filter(Boolean)
                    .join(', '),
          },
          {
            label: 'Money out',
            value: shown(spent),
            note:
              of('cost').length === 0
                ? 'No costs added yet'
                : `${of('cost').length} ${of('cost').length === 1 ? 'cost' : 'costs'}`,
            href: '/finance/costs',
          },
          {
            label: 'Left',
            value: shown(left),
            note: left.complete && left.total < 0 ? 'More went out than came in' : 'Money in, less money out',
            tone: left.complete && left.total < 0 ? 'bad' : undefined,
          },
          {
            label: 'Invoiced',
            value: shown(invoiced),
            note:
              vat.complete && vat.total > 0
                ? `Including ${shown(vat)} VAT`
                : 'Invoices sent in the period',
          },
        ]}
      />

      <div className={styles.stack}>
        <div className={table.frame}>
          <div className={table.toolbar}>
            <div className={table.toolbarText}>
              <h2 className={table.title}>Month by month</h2>
            </div>
          </div>
          <div className={table.scroll}>
            <table className={table.table}>
              <thead>
                <tr>
                  <th className={table.th} scope="col">
                    Month
                  </th>
                  <th className={`${table.th} ${table.numericHead}`} scope="col">
                    Invoiced
                  </th>
                  <th className={`${table.th} ${table.numericHead}`} scope="col">
                    Money in
                  </th>
                  <th className={`${table.th} ${table.numericHead}`} scope="col">
                    Money out
                  </th>
                  <th className={`${table.th} ${table.numericHead}`} scope="col">
                    Left
                  </th>
                </tr>
              </thead>
              <tbody>
                {months.map((row) => (
                  <tr key={row.month} className={table.tr}>
                    <td className={`${table.td} ${table.primary} ${table.nowrap}`}>
                      {monthLabel(row.month)}
                    </td>
                    <td className={`${table.td} ${table.numeric}`}>{cell(row.invoiced)}</td>
                    <td className={`${table.td} ${table.numeric}`}>{cell(row.moneyIn)}</td>
                    <td className={`${table.td} ${table.numeric}`}>{cell(row.moneyOut)}</td>
                    <td
                      className={`${table.td} ${table.numeric} ${
                        row.left.complete && row.left.total < 0 ? table.late : ''
                      }`}
                    >
                      {cell(row.left)}
                    </td>
                  </tr>
                ))}
                {months.length > 1 && (
                  <tr className={table.totalRow}>
                    <td className={`${table.td} ${table.primary}`}>Total</td>
                    <td className={`${table.td} ${table.numeric}`}>{cell(invoiced)}</td>
                    <td className={`${table.td} ${table.numeric}`}>{cell(moneyIn)}</td>
                    <td className={`${table.td} ${table.numeric}`}>{cell(spent)}</td>
                    <td className={`${table.td} ${table.numeric}`}>{cell(left)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.columns}>
          <div className={table.frame}>
            <div className={table.toolbar}>
              <div className={table.toolbarText}>
                <h2 className={table.title}>Where the money came from</h2>
              </div>
            </div>
            <div className={table.scroll}>
              <table className={`${table.table} ${table.compact}`}>
                <thead>
                  <tr>
                    <th className={table.th} scope="col">
                      Service
                    </th>
                    <th className={`${table.th} ${table.numericHead}`} scope="col">
                      Money in
                    </th>
                    <th className={`${table.th} ${table.numericHead}`} scope="col">
                      Share
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {byService.length === 0 ? (
                    <tr>
                      <td className={table.emptyCell} colSpan={3}>
                        <p className={table.emptyTitle}>Nothing received in this period.</p>
                      </td>
                    </tr>
                  ) : (
                    byService.map((row) => (
                      <tr key={row.key} className={table.tr}>
                        <td className={`${table.td} ${table.primary}`}>{row.label}</td>
                        <td className={`${table.td} ${table.numeric}`}>{cell(row.amount)}</td>
                        <td className={`${table.td} ${table.numeric}`}>{share(row.amount, moneyIn)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className={table.frame}>
            <div className={table.toolbar}>
              <div className={table.toolbarText}>
                <h2 className={table.title}>Where the money went</h2>
              </div>
            </div>
            <div className={table.scroll}>
              <table className={`${table.table} ${table.compact}`}>
                <thead>
                  <tr>
                    <th className={table.th} scope="col">
                      Spent on
                    </th>
                    <th className={`${table.th} ${table.numericHead}`} scope="col">
                      Money out
                    </th>
                    <th className={`${table.th} ${table.numericHead}`} scope="col">
                      Share
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {byCategory.length === 0 ? (
                    <tr>
                      <td className={table.emptyCell} colSpan={3}>
                        <p className={table.emptyTitle}>No costs in this period.</p>
                        <p className={table.emptyHint}>
                          <Link href="/finance/costs" className={table.link}>
                            Add the bills
                          </Link>{' '}
                          as they come in.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    byCategory.map((row) => (
                      <tr key={row.key} className={table.tr}>
                        <td className={`${table.td} ${table.primary}`}>{row.label}</td>
                        <td className={`${table.td} ${table.numeric}`}>{cell(row.amount)}</td>
                        <td className={`${table.td} ${table.numeric}`}>{share(row.amount, spent)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {byProduct.length > 0 && (
          <div className={table.frame}>
            <div className={table.toolbar}>
              <div className={table.toolbarText}>
                <h2 className={table.title}>Our products</h2>
              </div>
              <div className={table.toolbarActions}>
                <Link href="/finance/income" className={table.action}>
                  Add their income
                </Link>
              </div>
            </div>
            <div className={table.scroll}>
              <table className={table.table}>
                <thead>
                  <tr>
                    <th className={table.th} scope="col">
                      Product
                    </th>
                    <th className={`${table.th} ${table.numericHead}`} scope="col">
                      Money in
                    </th>
                    <th className={`${table.th} ${table.numericHead}`} scope="col">
                      Costs to run
                    </th>
                    <th className={`${table.th} ${table.numericHead}`} scope="col">
                      Left
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {byProduct.map((product) => (
                    <tr key={product.id} className={table.tr}>
                      <td className={`${table.td} ${table.primary}`}>
                        {product.name}
                        {product.isActive ? null : <span className={table.muted}> (stopped)</span>}
                      </td>
                      <td className={`${table.td} ${table.numeric}`}>{cell(product.incoming)}</td>
                      <td className={`${table.td} ${table.numeric}`}>{cell(product.outgoing)}</td>
                      <td
                        className={`${table.td} ${table.numeric} ${
                          product.left.complete && product.left.total < 0 ? table.late : ''
                        }`}
                      >
                        {cell(product.left)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className={table.frame}>
          <div className={table.toolbar}>
            <div className={table.toolbarText}>
              <h2 className={table.title}>By client</h2>
            </div>
          </div>
          <div className={table.scroll}>
            <table className={table.table}>
              <thead>
                <tr>
                  <th className={table.th} scope="col">
                    Client
                  </th>
                  <th className={`${table.th} ${table.numericHead}`} scope="col">
                    Money in
                  </th>
                  <th className={`${table.th} ${table.numericHead}`} scope="col">
                    Costs for them
                  </th>
                  <th className={`${table.th} ${table.numericHead}`} scope="col">
                    Left
                  </th>
                </tr>
              </thead>
              <tbody>
                {byClient.length === 0 ? (
                  <tr>
                    <td className={table.emptyCell} colSpan={4}>
                      <p className={table.emptyTitle}>Nothing in this period.</p>
                    </td>
                  </tr>
                ) : (
                  byClient.map((row) => (
                    <tr key={row.key} className={table.tr}>
                      <td className={`${table.td} ${table.primary}`}>
                        {row.name}
                        {row.removed ? <span className={table.muted}> (removed)</span> : null}
                      </td>
                      <td className={`${table.td} ${table.numeric}`}>{cell(row.incoming)}</td>
                      <td className={`${table.td} ${table.numeric}`}>{cell(row.outgoing)}</td>
                      <td
                        className={`${table.td} ${table.numeric} ${
                          row.left.complete && row.left.total < 0 ? table.late : ''
                        }`}
                      >
                        {cell(row.left)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {rateRows.length > 0 && (
          <section id="rates" className={forms.card}>
            <div className={forms.cardHeader}>
              <h2 className={forms.cardTitle}>Exchange rates</h2>
              <span className={forms.cardMeta}>For the combined totals only</span>
            </div>
            <div className={finance.rates}>
              {rateRows.map((row) => (
                <RateForm
                  key={`${row.month}|${row.base}|${row.quote}`}
                  month={row.month}
                  label={monthLabel(row.month)}
                  base={row.base}
                  quote={row.quote}
                  rate={rateOf(rates, row.month, row.base, row.quote)}
                />
              ))}
            </div>
            <p className={forms.hint}>Use the rate for the month, such as your bank&rsquo;s.</p>
          </section>
        )}

        <h2 className={finance.section}>Still to come in</h2>

        <Figures
          label="Still to come in"
          items={[
            {
              label: 'Overdue',
              value: sideBySide(pick(coming.overdue.byCurrency)),
              note:
                coming.overdue.count === 0
                  ? 'Nothing is late'
                  : `${coming.overdue.count} ${coming.overdue.count === 1 ? 'invoice' : 'invoices'}${
                      coming.lateMore.count > 0 ? `, ${coming.lateMore.count} over 60 days late` : ''
                    }`,
              tone: coming.overdue.count > 0 ? 'bad' : undefined,
              href: coming.overdue.count > 0 ? '#owing' : undefined,
            },
            {
              label: 'Due in the next 30 days',
              value: sideBySide(pick(coming.dueSoon.byCurrency)),
              note: `${coming.dueSoon.count} ${coming.dueSoon.count === 1 ? 'invoice' : 'invoices'}`,
              href: coming.dueSoon.count > 0 ? '#owing' : undefined,
            },
            {
              label: 'Renewals to invoice',
              value: sideBySide(pick(coming.renewals.byCurrency)),
              note: `In the next ${INVOICE_AHEAD_DAYS} days`,
              href: mayInvoices ? '/renewals' : undefined,
            },
            {
              label: 'Agreed, not invoiced',
              value: sideBySide(pick(coming.agreed)),
              note: 'Fees on agreed projects',
              href: agreedProjects.length > 0 ? '#agreed' : undefined,
            },
            {
              label: 'In proposals',
              value: sideBySide(pick(coming.inProposals)),
              note: 'Not agreed yet',
            },
          ]}
        />

        <div id="owing" className={table.frame}>
          <div className={table.toolbar}>
            <div className={table.toolbarText}>
              <h2 className={table.title}>Owed to us</h2>
              <span className={table.count}>{owing.length}</span>
            </div>
          </div>
          <div className={table.scroll}>
            <table className={table.table}>
              <thead>
                <tr>
                  <th className={table.th} scope="col">
                    Invoice
                  </th>
                  <th className={table.th} scope="col">
                    Client
                  </th>
                  <th className={table.th} scope="col">
                    Due
                  </th>
                  <th className={table.th} scope="col">
                    Standing
                  </th>
                  <th className={`${table.th} ${table.numericHead}`} scope="col">
                    Still owed
                  </th>
                </tr>
              </thead>
              <tbody>
                {owing.length === 0 ? (
                  <tr>
                    <td className={table.emptyCell} colSpan={5}>
                      <p className={table.emptyTitle}>Nothing is owed.</p>
                    </td>
                  </tr>
                ) : (
                  owing.map((invoice) => (
                    <tr key={invoice.number} className={table.tr}>
                      <td className={`${table.td} ${table.primary} ${table.nowrap}`}>
                        {mayInvoices ? (
                          <Link href={`/invoices/${invoice.number}`} className={table.link}>
                            {invoice.number}
                          </Link>
                        ) : (
                          invoice.number
                        )}
                      </td>
                      <td className={`${table.td} ${table.name}`}>
                        <Link href={`/clients/${invoice.clientSlug}`} className={table.link}>
                          {invoice.client}
                        </Link>
                      </td>
                      <td className={`${table.td} ${table.nowrap}`}>
                        {formatShortDate(invoice.dueAt)}
                      </td>
                      <td
                        className={`${table.td} ${table.nowrap} ${
                          invoice.dueAt && invoice.daysLate > 0 ? table.late : ''
                        }`}
                      >
                        {!invoice.dueAt
                          ? 'No due date'
                          : invoice.daysLate > 0
                            ? `${invoice.daysLate} ${invoice.daysLate === 1 ? 'day' : 'days'} late`
                            : invoice.daysLate === 0
                              ? 'Due today'
                              : `Due in ${-invoice.daysLate} ${-invoice.daysLate === 1 ? 'day' : 'days'}`}
                      </td>
                      <td className={`${table.td} ${table.numeric}`}>
                        {formatMoney(invoice.outstandingMinor, invoice.currency)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {agreedProjects.length > 0 && (
          <div id="agreed" className={table.frame}>
            <div className={table.toolbar}>
              <div className={table.toolbarText}>
                <h2 className={table.title}>Agreed, not yet invoiced</h2>
                <span className={table.count}>{agreedProjects.length}</span>
              </div>
            </div>
            <div className={table.scroll}>
              <table className={table.table}>
                <thead>
                  <tr>
                    <th className={table.th} scope="col">
                      Project
                    </th>
                    <th className={table.th} scope="col">
                      Number
                    </th>
                    <th className={table.th} scope="col">
                      Client
                    </th>
                    <th className={`${table.th} ${table.numericHead}`} scope="col">
                      Not yet invoiced
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {agreedProjects.map((project) => (
                    <tr key={`${project.slug}|${project.currency}`} className={table.tr}>
                      <td className={`${table.td} ${table.primary}`}>
                        <Link
                          href={`/projects/${project.slug}${mayFees ? '?tab=fees' : ''}`}
                          className={table.link}
                        >
                          {project.name}
                        </Link>
                      </td>
                      <td className={`${table.td} ${table.nowrap}`}>{project.reference}</td>
                      <td className={`${table.td} ${table.name}`}>{project.client}</td>
                      <td className={`${table.td} ${table.numeric}`}>
                        {formatMoney(project.minor, project.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
