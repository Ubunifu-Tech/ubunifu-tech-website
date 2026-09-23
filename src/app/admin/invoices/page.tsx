import Link from 'next/link';
import { db } from '@/lib/db';
import type { Prisma } from '@/generated/prisma/client';
import { requirePermission } from '@/lib/console/auth';
import { INVOICE_STATUS_LABEL } from '@/lib/console/billing-labels';
import { formatMoney, formatShortDate } from '@/lib/console/money';
import { Figures } from '@/components/console/Figures';
import { ListFooter, ListToolbar, searchText } from '@/components/console/ListToolbar';
import styles from '../Admin.module.css';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';

export const metadata = { title: 'Invoices' };

const STATUS_BADGE: Record<string, string> = {
  draft: '',
  sent: forms.badgeLive,
  part_paid: forms.badgeWarn,
  paid: forms.badgeGood,
  overdue: forms.badgeBad,
  void: '',
};

const FILTERS = [
  { key: 'owing', label: 'Owed to us' },
  { key: 'draft', label: 'Drafts' },
  { key: 'paid', label: 'Settled' },
  { key: 'all', label: 'Everything' },
] as const;

function filterToWhere(key: string): Prisma.InvoiceWhereInput {
  switch (key) {
    case 'draft':
      return { status: 'draft' };
    case 'paid':
      return { status: 'paid' };
    case 'all':
      return {};
    default:
      return { status: { in: ['sent', 'part_paid', 'overdue'] } };
  }
}

/** Amounts in several currencies, side by side. Never added together. */
function amounts(byCurrency: Map<string, number>): string {
  const parts = [...byCurrency].filter(([, amount]) => amount > 0);
  return parts.length === 0
    ? formatMoney(0, 'USD')
    : parts.map(([currency, amount]) => formatMoney(amount, currency)).join(' + ');
}

function addTo(map: Map<string, number>, currency: string, amount: number) {
  map.set(currency, (map.get(currency) ?? 0) + amount);
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string; q?: string }>;
}) {
  await requirePermission('invoices');
  const { show, q } = await searchParams;
  const active = FILTERS.some((f) => f.key === show) ? show! : 'owing';
  const query = searchText(q);
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);

  const matching: Prisma.InvoiceWhereInput = query
    ? {
        OR: [
          { number: { contains: query, mode: 'insensitive' } },
          { client: { name: { contains: query, mode: 'insensitive' } } },
          { client: { legalName: { contains: query, mode: 'insensitive' } } },
          { project: { name: { contains: query, mode: 'insensitive' } } },
        ],
      }
    : {};

  const [invoices, viewCounts, open, drafts, payments] = await Promise.all([
    db.invoice.findMany({
      where: { AND: [filterToWhere(active), matching] },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
      take: 200,
      select: {
        id: true,
        number: true,
        status: true,
        currency: true,
        totalMinor: true,
        paidMinor: true,
        issuedAt: true,
        dueAt: true,
        client: { select: { name: true, slug: true } },
        project: { select: { name: true, slug: true } },
      },
    }),
    Promise.all(
      FILTERS.map((filter) =>
        db.invoice.count({ where: { AND: [filterToWhere(filter.key), matching] } }),
      ),
    ),
    // The figures describe the whole ledger, whichever view is open below.
    db.invoice.findMany({
      where: filterToWhere('owing'),
      select: { currency: true, totalMinor: true, paidMinor: true, dueAt: true },
    }),
    db.invoice.count({ where: { status: 'draft' } }),
    db.payment.findMany({
      where: { receivedAt: { gte: lastMonthStart } },
      select: { amountMinor: true, currency: true, receivedAt: true },
    }),
  ]);

  /**
   * Totalled per currency, never summed across them. There is no exchange rate
   * anywhere in this system, so one combined figure would be a number that does
   * not mean anything.
   */
  const owed = new Map<string, number>();
  const overdue = new Map<string, number>();
  let overdueCount = 0;
  for (const invoice of open) {
    const left = Math.max(0, invoice.totalMinor - invoice.paidMinor);
    addTo(owed, invoice.currency, left);
    if (left > 0 && invoice.dueAt && invoice.dueAt < today) {
      addTo(overdue, invoice.currency, left);
      overdueCount += 1;
    }
  }
  const thisMonth = new Map<string, number>();
  const lastMonth = new Map<string, number>();
  for (const payment of payments) {
    addTo(payment.receivedAt >= monthStart ? thisMonth : lastMonth, payment.currency, payment.amountMinor);
  }

  const total = viewCounts[FILTERS.findIndex((f) => f.key === active)] ?? invoices.length;

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <h1 className={styles.heading}>
            Money <span className={styles.headingAccent}>owed</span>
          </h1>
          <p className={styles.lead}>
            Every invoice and what is still owed. Record payments as they arrive.
          </p>
        </div>
      </div>

      <Figures
        items={[
          {
            label: 'Owed to us',
            value: amounts(owed),
            note: `${open.length} ${open.length === 1 ? 'invoice' : 'invoices'} open`,
            href: '/invoices',
          },
          {
            label: 'Overdue',
            value: overdueCount,
            note: overdueCount === 0 ? 'Nothing past its due date' : `${amounts(overdue)} past due`,
            tone: overdueCount > 0 ? 'bad' : undefined,
          },
          {
            label: 'Received this month',
            value: amounts(thisMonth),
            note: `Last month ${amounts(lastMonth)}`,
          },
          {
            label: 'Drafts',
            value: drafts,
            note: drafts === 0 ? 'Nothing waiting to go out' : 'Not sent yet',
            href: '/invoices?show=draft',
          },
        ]}
      />

      <div className={table.frame}>
        <ListToolbar
          path="/invoices"
          views={FILTERS.map((filter, index) => ({ ...filter, count: viewCounts[index] ?? 0 }))}
          current={active}
          defaultView="owing"
          query={query}
          searchLabel="Search invoices"
        />

        <div className={table.scroll}>
          <table className={table.table}>
            <thead>
              <tr>
                <th className={table.th} scope="col">Number</th>
                <th className={table.th} scope="col">Client</th>
                <th className={table.th} scope="col">Project</th>
                <th className={table.th} scope="col">State</th>
                <th className={table.th} scope="col">Due</th>
                <th className={`${table.th} ${table.numericHead}`} scope="col">Total</th>
                <th className={`${table.th} ${table.numericHead}`} scope="col">Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td className={table.emptyCell} colSpan={7}>
                    <p className={table.emptyTitle}>
                      {query
                        ? `No invoices match “${query}” here.`
                        : active === 'owing'
                          ? 'Nothing outstanding.'
                          : 'No invoices here.'}
                    </p>
                    <p className={table.emptyHint}>
                      {query
                        ? 'Try another view, or search for something else.'
                        : 'Raise one from a project’s Fees tab.'}
                    </p>
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => {
                  const owed = Math.max(0, invoice.totalMinor - invoice.paidMinor);
                  const late =
                    invoice.dueAt !== null &&
                    owed > 0 &&
                    invoice.status !== 'draft' &&
                    invoice.dueAt.getTime() < today.getTime();

                  return (
                    <tr key={invoice.id} className={table.tr}>
                      <td className={`${table.td} ${table.primary} ${table.nowrap}`}>
                        <Link href={`/invoices/${invoice.number}`} className={table.link}>
                          {invoice.number}
                        </Link>
                        <span className={table.sub}>
                          {invoice.issuedAt ? formatShortDate(invoice.issuedAt) : 'Not sent'}
                        </span>
                      </td>
                      <td className={`${table.td} ${table.name}`}>
                        <Link href={`/clients/${invoice.client.slug}`} className={table.link}>
                          {invoice.client.name}
                        </Link>
                      </td>
                      <td className={`${table.td} ${table.name}`}>
                        {invoice.project ? (
                          <Link href={`/projects/${invoice.project.slug}`} className={table.link}>
                            {invoice.project.name}
                          </Link>
                        ) : (
                          <span className={table.muted}>No project</span>
                        )}
                      </td>
                      <td className={table.td}>
                        <span className={`${forms.badge} ${STATUS_BADGE[invoice.status]}`}>
                          {INVOICE_STATUS_LABEL[invoice.status]}
                        </span>
                      </td>
                      <td className={`${table.td} ${table.nowrap}`}>
                        {formatShortDate(invoice.dueAt)}
                        {late && <span className={table.sub}>past due</span>}
                      </td>
                      <td className={`${table.td} ${table.numeric}`}>
                        {formatMoney(invoice.totalMinor, invoice.currency)}
                      </td>
                      <td className={`${table.td} ${table.numeric}`}>
                        {owed === 0 ? (
                          <span className={table.muted}>Paid</span>
                        ) : (
                          formatMoney(owed, invoice.currency)
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <ListFooter shown={invoices.length} total={total} noun={['invoice', 'invoices']} query={query} />
      </div>
    </main>
  );
}
