import Link from 'next/link';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/console/auth';
import { addTo, monthDate, monthKey, monthLabel, sideBySide } from '@/lib/console/finance';
import { formatMoney, formatShortDate, moneyInput, toDateInputValue, todayInput } from '@/lib/console/money';
import { Figures } from '@/components/console/Figures';
import { AddIncome, IncomeMenu } from './IncomeForms';
import styles from '../../Admin.module.css';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';

export const metadata = { title: 'Income' };

const shift = (key: string, by: number) => {
  const date = monthDate(key);
  return monthKey(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + by, 1)));
};

/**
 * Money that came in without an invoice here, a month at a time: most often
 * what our own products collect, such as a month of Sifa subscriptions.
 * Payments against invoices are recorded on the invoice, not here.
 */
export default async function IncomePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  await requirePermission('finance');
  const { month: asked } = await searchParams;
  const today = todayInput();
  const thisMonth = today.slice(0, 7);
  const month = asked && /^\d{4}-\d{2}$/.test(asked) && asked <= thisMonth ? asked : thisMonth;
  const from = monthDate(month);
  const to = monthDate(shift(month, 1));

  const [entries, products, sources] = await Promise.all([
    db.income.findMany({
      where: { receivedOn: { gte: from, lt: to } },
      orderBy: [{ receivedOn: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        source: true,
        description: true,
        amountMinor: true,
        currency: true,
        receivedOn: true,
        productId: true,
        product: { select: { name: true } },
      },
    }),
    db.product.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    db.income.findMany({ distinct: ['source'], orderBy: { source: 'asc' }, select: { source: true } }),
  ]);

  const totals = new Map<string, number>();
  for (const entry of entries) addTo(totals, entry.currency, entry.amountMinor);
  const byProduct = new Map<string, Map<string, number>>();
  for (const entry of entries) {
    const key = entry.product?.name ?? 'Not a product';
    const map = byProduct.get(key) ?? new Map<string, number>();
    addTo(map, entry.currency, entry.amountMinor);
    byProduct.set(key, map);
  }
  // An earlier month's entries are dated on its last day.
  const entryDate = month === thisMonth ? today : toDateInputValue(new Date(to.getTime() - 43_200_000));
  const sourceList = sources.map((row) => row.source);

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <h1 className={styles.heading}>
            Other <span className={styles.headingAccent}>income</span>
          </h1>
          <p className={styles.lead}>
            {monthLabel(month)}. Money that came in without an invoice here, such as what our
            products collect. Payments against invoices go on the invoice.
          </p>
        </div>
        <div className={styles.headActions}>
          <nav className={table.views} aria-label="Month">
            <Link href={`/finance/income?month=${shift(month, -1)}`} className={table.view}>
              ← {monthLabel(shift(month, -1))}
            </Link>
            <Link
              href="/finance/income"
              className={table.view}
              aria-current={month === thisMonth ? 'page' : undefined}
            >
              This month
            </Link>
            {month < thisMonth && (
              <Link href={`/finance/income?month=${shift(month, 1)}`} className={table.view}>
                {monthLabel(shift(month, 1))} →
              </Link>
            )}
          </nav>
          <Link href="/finance" className={`${forms.button} ${forms.quiet}`}>
            Reports
          </Link>
        </div>
      </div>

      <Figures
        items={[
          {
            label: month === thisMonth ? 'Came in this month' : `Came in during ${monthLabel(month)}`,
            value: sideBySide(totals),
            note: `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`,
          },
          ...[...byProduct.entries()].slice(0, 3).map(([name, map]) => ({
            label: name,
            value: sideBySide(map),
            note: 'This month',
          })),
        ]}
      />

      <div className={styles.stack}>
        <section className={forms.card}>
          <div className={forms.cardHeader}>
            <h2 className={forms.cardTitle}>Add income</h2>
            <span className={forms.cardMeta}>From the statement, in the currency it came in</span>
          </div>
          <AddIncome products={products} sources={sourceList} today={entryDate} />
        </section>

        <div className={table.frame}>
          <div className={table.toolbar}>
            <div className={table.toolbarText}>
              <h2 className={table.title}>Income in {monthLabel(month)}</h2>
              <span className={table.count}>{entries.length}</span>
            </div>
          </div>
          <div className={table.scroll}>
            <table className={table.table}>
              <thead>
                <tr>
                  <th className={table.th} scope="col">
                    Date
                  </th>
                  <th className={table.th} scope="col">
                    From
                  </th>
                  <th className={table.th} scope="col">
                    Product
                  </th>
                  <th className={table.th} scope="col">
                    Note
                  </th>
                  <th className={`${table.th} ${table.numericHead}`} scope="col">
                    Amount
                  </th>
                  <th className={`${table.th} ${table.actionsHead}`} scope="col">
                    <span className={table.muted}>Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr>
                    <td className={table.emptyCell} colSpan={6}>
                      <p className={table.emptyTitle}>Nothing added for {monthLabel(month)}.</p>
                      <p className={table.emptyHint}>
                        Add what each product collected when the month closes.
                      </p>
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => (
                    <tr key={entry.id} className={table.tr}>
                      <td className={`${table.td} ${table.nowrap}`}>
                        {formatShortDate(entry.receivedOn)}
                      </td>
                      <td className={`${table.td} ${table.primary}`}>{entry.source}</td>
                      <td className={table.td}>
                        {entry.product?.name ?? <span className={table.muted}>None</span>}
                      </td>
                      <td className={table.td}>
                        {entry.description ? (
                          <span className={table.clamp}>{entry.description}</span>
                        ) : (
                          <span className={table.muted}>None</span>
                        )}
                      </td>
                      <td className={`${table.td} ${table.numeric}`}>
                        {formatMoney(entry.amountMinor, entry.currency)}
                      </td>
                      <td className={`${table.td} ${table.actions}`}>
                        <IncomeMenu
                          products={products}
                          sources={sourceList}
                          entry={{
                            id: entry.id,
                            source: entry.source,
                            description: entry.description,
                            amount: moneyInput(entry.amountMinor, entry.currency),
                            currency: entry.currency,
                            productId: entry.productId,
                            receivedOn: toDateInputValue(entry.receivedOn),
                          }}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
