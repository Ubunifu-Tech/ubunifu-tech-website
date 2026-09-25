import Link from 'next/link';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/console/auth';
import {
  RENEWAL_STATUS_LABEL,
  ensureRenewalEvents,
  periodLabel,
} from '@/lib/console/renewals';
import { formatMoney, formatShortDate } from '@/lib/console/money';
import { Figures } from '@/components/console/Figures';
import styles from '../Admin.module.css';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';
import { renewingLine } from '@/lib/console/live';

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
      lineItem: renewingLine,
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

  /** What a set of renewals comes to, per currency, never added across them. */
  const toInvoice = (rows: typeof renewals) => {
    const sums = new Map<string, number>();
    for (const row of rows) {
      const { currency, amountMinor, quantity } = row.lineItem;
      sums.set(currency, (sums.get(currency) ?? 0) + amountMinor * quantity);
    }
    return [...sums].map(([currency, amount]) => formatMoney(amount, currency)).join(' + ');
  };

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
      hint: 'Close enough to invoice now.',
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
            Domains, hosting and anything else billed again on a date. Nothing renews itself, so
            invoice these on time.
          </p>
        </div>
      </div>

      <Figures
        items={[
          {
            label: 'Past their date',
            value: overdue.length,
            note: overdue.length === 0 ? 'Nothing has slipped' : `${toInvoice(overdue)} not invoiced`,
            tone: overdue.length > 0 ? 'bad' : undefined,
            href: overdue.length > 0 ? '#overdue' : undefined,
          },
          {
            label: 'Due soon',
            value: soon.length,
            note: soon.length === 0 ? 'Nothing to invoice yet' : `${toInvoice(soon)} to invoice`,
            tone: soon.length > 0 ? 'warn' : undefined,
            href: soon.length > 0 ? '#soon' : undefined,
          },
          {
            label: 'Further out',
            value: later.length,
            note: 'Nothing to do yet',
            href: later.length > 0 ? '#later' : undefined,
          },
          {
            label: 'Invoiced',
            value: handled.length,
            note: 'Periods already billed',
            href: handled.length > 0 ? '#handled' : undefined,
          },
        ]}
      />

      <div className={styles.stack}>
        {groups.map((group) => (
          <div key={group.key} id={group.key} className={table.frame}>
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
