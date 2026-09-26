import Link from 'next/link';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/console/auth';
import { COST_CATEGORY_LABEL } from '@/lib/console/cost-labels';
import { addTo, monthDate, monthKey, monthLabel, sideBySide } from '@/lib/console/finance';
import { formatMoney, formatShortDate, moneyInput, toDateInputValue, todayInput } from '@/lib/console/money';
import { Figures } from '@/components/console/Figures';
import { uploadsConfigured } from '@/lib/console/uploads';
import {
  AddCost,
  AddMonthOf,
  AttachBill,
  CostMenu,
  RegularMenu,
  type Choices,
} from './CostForms';
import styles from '../../Admin.module.css';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';

export const metadata = { title: 'Costs' };

const shift = (key: string, by: number) => {
  const date = monthDate(key);
  return monthKey(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + by, 1)));
};

/**
 * What the business spends, a month at a time: the bills typed in as they
 * arrive, and the regular ones waiting for this month's amount.
 */
export default async function CostsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  await requirePermission('finance');
  const canAttach = uploadsConfigured();
  const { month: asked } = await searchParams;
  const today = todayInput();
  const thisMonth = today.slice(0, 7);
  const month = asked && /^\d{4}-\d{2}$/.test(asked) && asked <= thisMonth ? asked : thisMonth;
  const from = monthDate(month);
  const to = monthDate(shift(month, 1));

  const [costs, regulars, clients, projects, vendors, products] = await Promise.all([
    db.cost.findMany({
      where: { incurredOn: { gte: from, lt: to } },
      orderBy: [{ incurredOn: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        vendor: true,
        category: true,
        description: true,
        amountMinor: true,
        currency: true,
        incurredOn: true,
        regularId: true,
        clientId: true,
        projectId: true,
        productId: true,
        product: { select: { name: true } },
        client: { select: { name: true, deletedAt: true } },
        project: { select: { name: true, slug: true, deletedAt: true } },
        files: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, filename: true },
        },
      },
    }),
    db.regularCost.findMany({
      orderBy: [{ isActive: 'desc' }, { vendor: 'asc' }],
      select: {
        id: true,
        vendor: true,
        category: true,
        description: true,
        usualMinor: true,
        currency: true,
        isActive: true,
        clientId: true,
        projectId: true,
        productId: true,
        createdAt: true,
        client: { select: { name: true } },
        project: { select: { name: true } },
        product: { select: { name: true } },
      },
    }),
    db.client.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    db.project.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, clientId: true },
    }),
    db.cost.findMany({ distinct: ['vendor'], orderBy: { vendor: 'asc' }, select: { vendor: true } }),
    db.product.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ]);

  const choices: Choices = {
    clients,
    projects,
    products,
    vendors: [...new Set([...vendors.map((row) => row.vendor), ...regulars.map((r) => r.vendor)])].sort(),
  };

  const totals = new Map<string, number>();
  for (const cost of costs) addTo(totals, cost.currency, cost.amountMinor);

  // A regular cost is expected in months from the one it was set up in.
  const added = new Set(costs.flatMap((cost) => (cost.regularId ? [cost.regularId] : [])));
  const expected = regulars.filter(
    (regular) => regular.isActive && monthKey(regular.createdAt) <= month,
  );
  const waiting = expected.filter((regular) => !added.has(regular.id));
  // This month's entries are dated today; an earlier month's, on its last day.
  const entryDate = month === thisMonth ? today : toDateInputValue(new Date(to.getTime() - 43_200_000));

  const forWhat = (row: {
    client: { name: string; deletedAt?: Date | null } | null;
    project: { name: string } | null;
    product: { name: string } | null;
  }) =>
    [
      row.project?.name ??
        (row.client ? `${row.client.name}${row.client.deletedAt ? ' (removed)' : ''}` : null),
      row.product?.name ?? null,
    ]
      .filter(Boolean)
      .join(', ') || null;

  const regularValues = (regular: (typeof regulars)[number]) => ({
    id: regular.id,
    vendor: regular.vendor,
    category: regular.category,
    description: regular.description,
    usual: moneyInput(regular.usualMinor, regular.currency),
    currency: regular.currency,
    clientId: regular.clientId,
    projectId: regular.projectId,
    productId: regular.productId,
    isActive: regular.isActive,
  });

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <h1 className={styles.heading}>
            What the business <span className={styles.headingAccent}>spends</span>
          </h1>
          <p className={styles.lead}>{monthLabel(month)}.</p>
        </div>
        <div className={styles.headActions}>
          <nav className={table.views} aria-label="Month">
            <Link href={`/finance/costs?month=${shift(month, -1)}`} className={table.view}>
              ← {monthLabel(shift(month, -1))}
            </Link>
            <Link
              href="/finance/costs"
              className={table.view}
              aria-current={month === thisMonth ? 'page' : undefined}
            >
              This month
            </Link>
            {month < thisMonth && (
              <Link href={`/finance/costs?month=${shift(month, 1)}`} className={table.view}>
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
            label: month === thisMonth ? 'Spent this month' : `Spent in ${monthLabel(month)}`,
            value: sideBySide(totals),
            note: `${costs.length} ${costs.length === 1 ? 'cost' : 'costs'}`,
          },
          {
            label: 'Regular costs to add',
            value: waiting.length,
            note: waiting.length === 0 ? 'All added' : 'Add their amounts below',
            tone: waiting.length > 0 ? 'warn' : undefined,
            href: waiting.length > 0 ? '#regular' : undefined,
          },
        ]}
      />

      <div className={styles.stack}>
        {expected.length > 0 && (
          <div id="regular" className={table.frame}>
            <div className={table.toolbar}>
              <div className={table.toolbarText}>
                <h2 className={table.title}>Regular costs for {monthLabel(month)}</h2>
                <span className={table.count}>
                  {expected.length - waiting.length} of {expected.length} added
                </span>
              </div>
            </div>
            <div className={table.scroll}>
              <table className={table.table}>
                <thead>
                  <tr>
                    <th className={table.th} scope="col">
                      Paid to
                    </th>
                    <th className={table.th} scope="col">
                      Spent on
                    </th>
                    <th className={`${table.th} ${table.numericHead}`} scope="col">
                      Usually
                    </th>
                    <th className={table.th} scope="col">
                      This month
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {expected.map((regular) => {
                    const entry = costs.find((cost) => cost.regularId === regular.id);
                    return (
                      <tr key={regular.id} className={table.tr}>
                        <td className={`${table.td} ${table.primary}`}>{regular.vendor}</td>
                        <td className={table.td}>{COST_CATEGORY_LABEL[regular.category]}</td>
                        <td className={`${table.td} ${table.numeric}`}>
                          {formatMoney(regular.usualMinor, regular.currency)}
                        </td>
                        <td className={table.td}>
                          {entry ? (
                            formatMoney(entry.amountMinor, entry.currency)
                          ) : (
                            <AddMonthOf regular={regularValues(regular)} date={entryDate} />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <section className={forms.card}>
          <div className={forms.cardHeader}>
            <h2 className={forms.cardTitle}>Add a cost</h2>
            <span className={forms.cardMeta}>From the bill, in the currency it was charged in</span>
          </div>
          <AddCost choices={choices} today={entryDate} canAttach={canAttach} />
        </section>

        <div className={table.frame}>
          <div className={table.toolbar}>
            <div className={table.toolbarText}>
              <h2 className={table.title}>Costs in {monthLabel(month)}</h2>
              <span className={table.count}>{costs.length}</span>
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
                    Paid to
                  </th>
                  <th className={table.th} scope="col">
                    Spent on
                  </th>
                  <th className={table.th} scope="col">
                    For
                  </th>
                  <th className={table.th} scope="col">
                    Note
                  </th>
                  <th className={`${table.th} ${table.numericHead}`} scope="col">
                    Amount
                  </th>
                  <th className={table.th} scope="col">
                    Bill
                  </th>
                  <th className={`${table.th} ${table.actionsHead}`} scope="col">
                    <span className={table.muted}>Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {costs.length === 0 ? (
                  <tr>
                    <td className={table.emptyCell} colSpan={8}>
                      <p className={table.emptyTitle}>No costs added for {monthLabel(month)}.</p>
                      <p className={table.emptyHint}>Add each bill as it arrives.</p>
                    </td>
                  </tr>
                ) : (
                  costs.map((cost) => (
                    <tr key={cost.id} className={table.tr}>
                      <td className={`${table.td} ${table.nowrap}`}>
                        {formatShortDate(cost.incurredOn)}
                      </td>
                      <td className={`${table.td} ${table.primary}`}>{cost.vendor}</td>
                      <td className={table.td}>{COST_CATEGORY_LABEL[cost.category]}</td>
                      <td className={`${table.td} ${table.name}`}>
                        {forWhat(cost) ?? <span className={table.muted}>The business</span>}
                      </td>
                      <td className={table.td}>
                        {cost.description ? (
                          <span className={table.clamp}>{cost.description}</span>
                        ) : (
                          <span className={table.muted}>None</span>
                        )}
                      </td>
                      <td className={`${table.td} ${table.numeric}`}>
                        {formatMoney(cost.amountMinor, cost.currency)}
                      </td>
                      <td className={`${table.td} ${table.nowrap}`}>
                        {cost.files[0] ? (
                          <a
                            href={`/files/${cost.files[0].id}`}
                            target="_blank"
                            rel="noopener"
                            className={table.link}
                            title={cost.files[0].filename}
                          >
                            View
                          </a>
                        ) : canAttach ? (
                          <AttachBill costId={cost.id} />
                        ) : (
                          <span className={table.muted}>None</span>
                        )}
                      </td>
                      <td className={`${table.td} ${table.actions}`}>
                        <CostMenu
                          hasBill={cost.files.length > 0}
                          choices={choices}
                          cost={{
                            id: cost.id,
                            vendor: cost.vendor,
                            category: cost.category,
                            description: cost.description,
                            amount: moneyInput(cost.amountMinor, cost.currency),
                            currency: cost.currency,
                            clientId: cost.clientId,
                            projectId: cost.projectId,
                            productId: cost.productId,
                            incurredOn: toDateInputValue(cost.incurredOn),
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

        {regulars.length > 0 && (
          <div className={table.frame}>
            <div className={table.toolbar}>
              <div className={table.toolbarText}>
                <h2 className={table.title}>Regular costs</h2>
                <span className={table.count}>{regulars.filter((r) => r.isActive).length} active</span>
              </div>
            </div>
            <div className={table.scroll}>
              <table className={table.table}>
                <thead>
                  <tr>
                    <th className={table.th} scope="col">
                      Paid to
                    </th>
                    <th className={table.th} scope="col">
                      Spent on
                    </th>
                    <th className={table.th} scope="col">
                      For
                    </th>
                    <th className={`${table.th} ${table.numericHead}`} scope="col">
                      Usually
                    </th>
                    <th className={table.th} scope="col">
                      State
                    </th>
                    <th className={`${table.th} ${table.actionsHead}`} scope="col">
                      <span className={table.muted}>Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {regulars.map((regular) => (
                    <tr key={regular.id} className={table.tr}>
                      <td className={`${table.td} ${table.primary}`}>{regular.vendor}</td>
                      <td className={table.td}>{COST_CATEGORY_LABEL[regular.category]}</td>
                      <td className={`${table.td} ${table.name}`}>
                        {forWhat(regular) ?? <span className={table.muted}>The business</span>}
                      </td>
                      <td className={`${table.td} ${table.numeric}`}>
                        {formatMoney(regular.usualMinor, regular.currency)}
                      </td>
                      <td className={table.td}>
                        {regular.isActive ? (
                          'Every month'
                        ) : (
                          <span className={table.muted}>Stopped</span>
                        )}
                      </td>
                      <td className={`${table.td} ${table.actions}`}>
                        <RegularMenu regular={regularValues(regular)} choices={choices} />
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
