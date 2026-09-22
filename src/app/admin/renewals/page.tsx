import Link from 'next/link';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/console/auth';
import {
  RENEWAL_STATUS_LABEL,
  ensureRenewalEvents,
  periodLabel,
} from '@/lib/console/renewals';
import { formatMoney, formatShortDate } from '@/lib/console/money';
import styles from '../Admin.module.css';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';

export const metadata = { title: 'Renewals' };

const KIND_LABEL: Record<string, string> = {
  recurring_monthly: 'Monthly',
  recurring_annual: 'Annual',
};

const STATUS_BADGE: Record<string, string> = {
  pending: forms.badgeWarn,
  drafted: forms.badgeLive,
  invoiced: forms.badgeLive,
  paid: forms.badgeGood,
  skipped: '',
  cancelled: '',
};

/**
 * Everything that renews, period by period.
 *
 * This is the screen that stops a domain expiring. It reads RenewalEvent — one
 * row per period — rather than the line's next date, so a client in year three
 * shows three rows with the first two settled, and billing one period does not
 * make the next invisible.
 *
 * Periods are materialised on load. There is no scheduler here, and a screen
 * nobody opens does not need rows waiting in a table.
 */
export default async function RenewalsPage() {
  await requirePermission('invoices');

  await ensureRenewalEvents();

  const now = new Date();

  const renewals = await db.renewalEvent.findMany({
    where: {
      status: { in: ['pending', 'drafted', 'invoiced'] },
      lineItem: {
        status: { in: ['planned', 'active'] },
        project: { deletedAt: null, status: { notIn: ['closed', 'cancelled'] } },
      },
    },
    orderBy: { dueAt: 'asc' },
    take: 300,
    select: {
      id: true,
      periodStart: true,
      periodEnd: true,
      dueAt: true,
      status: true,
      invoice: { select: { number: true, status: true } },
      lineItem: {
        select: {
          label: true,
          amountMinor: true,
          quantity: true,
          currency: true,
          billingKind: true,
          renewalLeadDays: true,
          project: {
            select: {
              name: true,
              slug: true,
              reference: true,
              client: { select: { name: true, slug: true } },
            },
          },
        },
      },
    },
  });

  const days = (date: Date) => Math.round((date.getTime() - now.getTime()) / 86_400_000);

  const unbilled = renewals.filter((renewal) => renewal.status === 'pending');
  const overdue = unbilled.filter((renewal) => days(renewal.dueAt) < 0);
  const soon = unbilled.filter((renewal) => {
    const distance = days(renewal.dueAt);
    return distance >= 0 && distance <= renewal.lineItem.renewalLeadDays;
  });
  const later = unbilled.filter(
    (renewal) => days(renewal.dueAt) > renewal.lineItem.renewalLeadDays,
  );
  const handled = renewals.filter((renewal) => renewal.status !== 'pending');

  const groups = [
    {
      key: 'overdue',
      title: 'Already past',
      hint: 'These dates have gone and nothing has been invoiced. Check the service is still live before anything else.',
      rows: overdue,
    },
    {
      key: 'soon',
      title: 'Coming up',
      hint: 'Inside the lead time on the line — close enough to invoice now.',
      rows: soon,
    },
    {
      key: 'later',
      title: 'Further out',
      hint: 'Nothing to do yet. Here so nothing is a surprise.',
      rows: later,
    },
    {
      key: 'handled',
      title: 'Invoiced',
      hint: 'Periods that have been billed. Kept so a year can be looked up later.',
      rows: handled,
    },
  ];

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <h1 className={styles.heading}>
            What <span className={styles.headingAccent}>renews</span>
          </h1>
          <p className={styles.lead}>
            Domains, hosting and anything else billed again on a date, one period at a time.
            Nothing chases these automatically, so this list is the only thing between a client and
            an expired domain.
          </p>
        </div>
      </div>

      <div className={styles.stats}>
        <div className={`${styles.stat} ${overdue.length > 0 ? styles.statAlert : ''}`}>
          <p className={styles.statLabel}>Past their date</p>
          <p className={styles.statValue}>{overdue.length}</p>
          <p className={styles.statHint}>
            {overdue.length === 0 ? 'Nothing has slipped' : 'Check these first'}
          </p>
        </div>
        <div className={styles.stat}>
          <p className={styles.statLabel}>Due soon</p>
          <p className={styles.statValue}>{soon.length}</p>
          <p className={styles.statHint}>Within the lead time</p>
        </div>
        <div className={styles.stat}>
          <p className={styles.statLabel}>Further out</p>
          <p className={styles.statValue}>{later.length}</p>
          <p className={styles.statHint}>Nothing to do yet</p>
        </div>
        <div className={styles.stat}>
          <p className={styles.statLabel}>Invoiced</p>
          <p className={styles.statValue}>{handled.length}</p>
          <p className={styles.statHint}>Periods already billed</p>
        </div>
      </div>

      <div className={styles.stack}>
        {groups.map((group) => (
          <div key={group.key} className={table.frame}>
            <div className={table.toolbar}>
              <div className={table.toolbarText}>
                <h2 className={table.title}>{group.title}</h2>
                <span className={table.count}>{group.hint}</span>
              </div>
            </div>
            <div className={table.scroll}>
              <table className={table.table}>
                <thead>
                  <tr>
                    <th className={table.th} scope="col">Item</th>
                    <th className={table.th} scope="col">Period</th>
                    <th className={table.th} scope="col">Project</th>
                    <th className={table.th} scope="col">Due</th>
                    <th className={`${table.th} ${table.numericHead}`} scope="col">Amount</th>
                    <th className={table.th} scope="col">State</th>
                    <th className={`${table.th} ${table.actionsHead}`} scope="col">
                      <span className={table.muted}>Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {group.rows.length === 0 ? (
                    <tr>
                      <td className={table.emptyCell} colSpan={7}>
                        <p className={table.emptyTitle}>Nothing here.</p>
                        <p className={table.emptyHint}>
                          {group.key === 'overdue'
                            ? 'No renewal period has been missed.'
                            : 'Nothing falls in this window.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    group.rows.map((renewal) => {
                      const line = renewal.lineItem;
                      const distance = days(renewal.dueAt);
                      return (
                        <tr key={renewal.id} className={table.tr}>
                          <td className={`${table.td} ${table.primary}`}>
                            {line.label}
                            <span className={table.sub}>
                              {KIND_LABEL[line.billingKind] ?? line.billingKind}
                            </span>
                          </td>
                          <td className={`${table.td} ${table.nowrap}`}>
                            {periodLabel(renewal.periodStart, renewal.periodEnd)}
                          </td>
                          <td className={`${table.td} ${table.name}`}>
                            <Link href={`/projects/${line.project.slug}`} className={table.link}>
                              {line.project.reference}
                            </Link>
                            <span className={table.sub}>{line.project.client.name}</span>
                          </td>
                          <td className={`${table.td} ${table.nowrap}`}>
                            {formatShortDate(renewal.dueAt)}
                            {renewal.status === 'pending' && (
                              <span className={table.sub}>
                                {distance < 0
                                  ? `${Math.abs(distance)} days ago`
                                  : `in ${distance} days`}
                              </span>
                            )}
                          </td>
                          <td className={`${table.td} ${table.numeric}`}>
                            {line.amountMinor === 0 ? (
                              <span className={table.muted}>No price</span>
                            ) : (
                              formatMoney(line.amountMinor * line.quantity, line.currency)
                            )}
                          </td>
                          <td className={table.td}>
                            <span className={`${forms.badge} ${STATUS_BADGE[renewal.status]}`}>
                              {RENEWAL_STATUS_LABEL[renewal.status]}
                            </span>
                          </td>
                          <td className={`${table.td} ${table.actions}`}>
                            <span className={table.actionGroup}>
                              {renewal.invoice ? (
                                <Link
                                  href={`/invoices/${renewal.invoice.number}`}
                                  className={table.action}
                                >
                                  {renewal.invoice.number}
                                </Link>
                              ) : (
                                <Link
                                  href={`/projects/${line.project.slug}`}
                                  className={table.action}
                                >
                                  Invoice it
                                </Link>
                              )}
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
        ))}
      </div>
    </main>
  );
}
