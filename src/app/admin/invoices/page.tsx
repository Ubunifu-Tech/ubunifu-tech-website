import Link from 'next/link';
import { db } from '@/lib/db';
import type { Prisma } from '@/generated/prisma/client';
import { requirePermission } from '@/lib/console/auth';
import { INVOICE_STATUS_LABEL } from '@/lib/console/billing-labels';
import { formatMoney, formatShortDate } from '@/lib/console/money';
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

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string }>;
}) {
  await requirePermission('invoices');
  const { show } = await searchParams;
  const active = FILTERS.some((f) => f.key === show) ? show! : 'owing';
  const today = new Date();

  const invoices = await db.invoice.findMany({
    where: filterToWhere(active),
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
  });

  /**
   * Totalled per currency, never summed across them. There is no exchange rate
   * anywhere in this system, so one combined figure would be a number that does
   * not mean anything.
   */
  const owedByCurrency = new Map<string, number>();
  for (const invoice of invoices) {
    if (invoice.status === 'void' || invoice.status === 'draft') continue;
    const owed = Math.max(0, invoice.totalMinor - invoice.paidMinor);
    owedByCurrency.set(invoice.currency, (owedByCurrency.get(invoice.currency) ?? 0) + owed);
  }

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <h1 className={styles.heading}>
            Money <span className={styles.headingAccent}>owed</span>
          </h1>
          <p className={styles.lead}>
            Payments are recorded by hand, so an invoice sitting unpaid may only mean nobody has
            entered it yet. Every recorded payment issues a numbered receipt.
          </p>
        </div>
      </div>

      <div className={styles.stats}>
        {owedByCurrency.size === 0 ? (
          <div className={styles.stat}>
            <p className={styles.statLabel}>Outstanding</p>
            <p className={styles.statValue}>Nothing</p>
            <p className={styles.statHint}>No unsettled invoices in this view</p>
          </div>
        ) : (
          [...owedByCurrency].map(([currency, owed]) => (
            <div key={currency} className={`${styles.stat} ${owed > 0 ? styles.statAlert : ''}`}>
              <p className={styles.statLabel}>Outstanding in {currency}</p>
              <p className={styles.statValue}>{formatMoney(owed, currency)}</p>
              <p className={styles.statHint}>Invoiced and not settled</p>
            </div>
          ))
        )}
        <div className={styles.stat}>
          <p className={styles.statLabel}>Overdue</p>
          <p className={styles.statValue}>
            {invoices.filter((i) => i.status === 'overdue').length}
          </p>
          <p className={styles.statHint}>Past their due date</p>
        </div>
        <div className={styles.stat}>
          <p className={styles.statLabel}>Drafts</p>
          <p className={styles.statValue}>{invoices.filter((i) => i.status === 'draft').length}</p>
          <p className={styles.statHint}>Raised but never sent</p>
        </div>
      </div>

      <div className={styles.filters}>
        {FILTERS.map((filter) => (
          <Link
            key={filter.key}
            href={filter.key === 'owing' ? '/invoices' : `/invoices?show=${filter.key}`}
            className={styles.filter}
            aria-current={filter.key === active}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      <div className={table.frame}>
        <div className={table.toolbar}>
          <div className={table.toolbarText}>
            <h2 className={table.title}>
              {FILTERS.find((f) => f.key === active)?.label ?? 'Invoices'}
            </h2>
            <span className={table.count}>
              {invoices.length} {invoices.length === 1 ? 'invoice' : 'invoices'}
            </span>
          </div>
        </div>

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
                <th className={`${table.th} ${table.actionsHead}`} scope="col">
                  <span className={table.muted}>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td className={table.emptyCell} colSpan={8}>
                    <p className={table.emptyTitle}>
                      {active === 'owing' ? 'Nothing outstanding.' : 'No invoices here.'}
                    </p>
                    <p className={table.emptyHint}>
                      Invoices are raised from a project&rsquo;s fee lines — open a project and use
                      &ldquo;Raise an invoice&rdquo;.
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
                          <span className={table.muted}>—</span>
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
                          <span className={table.muted}>—</span>
                        ) : (
                          formatMoney(owed, invoice.currency)
                        )}
                      </td>
                      <td className={`${table.td} ${table.actions}`}>
                        <span className={table.actionGroup}>
                          <Link href={`/invoices/${invoice.number}`} className={table.action}>
                            Open
                          </Link>
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
