import Link from 'next/link';
import { db } from '@/lib/db';
import { requireStaff } from '@/lib/console/auth';
import { formatMoney, formatShortDate } from '@/lib/console/money';
import styles from '../Admin.module.css';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';

export const metadata = { title: 'Renewals' };

const KIND_LABEL: Record<string, string> = {
  recurring_monthly: 'Monthly',
  recurring_annual: 'Annual',
};

/**
 * Everything that renews, in the order it will bite.
 *
 * This is the screen that stops a domain expiring. Recurring lines carry a next
 * due date and nothing else in the system chases them, so an unread list here
 * is a client's website going dark — which is why the window is wide and the
 * overdue ones are separated rather than sorted into the same list.
 */
export default async function RenewalsPage() {
  await requireStaff();
  const now = new Date();
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + 365);

  const lines = await db.lineItem.findMany({
    where: {
      status: { in: ['planned', 'active'] },
      nextDueAt: { not: null, lte: horizon },
      project: { deletedAt: null, status: { notIn: ['closed', 'cancelled'] } },
    },
    orderBy: { nextDueAt: 'asc' },
    select: {
      id: true,
      label: true,
      amountMinor: true,
      quantity: true,
      currency: true,
      billingKind: true,
      nextDueAt: true,
      renewalLeadDays: true,
      status: true,
      project: {
        select: {
          name: true,
          slug: true,
          reference: true,
          client: { select: { name: true, slug: true } },
        },
      },
      invoiceLines: {
        where: { invoice: { status: { not: 'void' } } },
        select: { invoice: { select: { number: true, status: true, dueAt: true } } },
      },
    },
  });

  const days = (date: Date) =>
    Math.round((date.getTime() - now.getTime()) / 86_400_000);

  const overdue = lines.filter((line) => days(line.nextDueAt!) < 0);
  const soon = lines.filter((line) => {
    const distance = days(line.nextDueAt!);
    return distance >= 0 && distance <= line.renewalLeadDays;
  });
  const later = lines.filter((line) => days(line.nextDueAt!) > line.renewalLeadDays);

  const groups = [
    {
      key: 'overdue',
      title: 'Already past',
      hint: 'These dates have gone. Check the service is still live before anything else.',
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
      title: 'Later this year',
      hint: 'Nothing to do yet. Here so nothing is a surprise.',
      rows: later,
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
            Domains, hosting and anything else billed again on a date. Nothing chases these
            automatically, so this list is the only thing between a client and an expired domain.
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
          <p className={styles.statLabel}>Later this year</p>
          <p className={styles.statValue}>{later.length}</p>
          <p className={styles.statHint}>Nothing to do yet</p>
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
                    <th className={table.th} scope="col">Client</th>
                    <th className={table.th} scope="col">Project</th>
                    <th className={table.th} scope="col">Renews</th>
                    <th className={table.th} scope="col">Every</th>
                    <th className={`${table.th} ${table.numericHead}`} scope="col">Amount</th>
                    <th className={table.th} scope="col">Invoiced</th>
                    <th className={`${table.th} ${table.actionsHead}`} scope="col">
                      <span className={table.muted}>Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {group.rows.length === 0 ? (
                    <tr>
                      <td className={table.emptyCell} colSpan={8}>
                        <p className={table.emptyTitle}>Nothing here.</p>
                        <p className={table.emptyHint}>
                          {group.key === 'overdue'
                            ? 'No renewal date has been missed.'
                            : 'Nothing falls in this window.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    group.rows.map((line) => {
                      const latest = line.invoiceLines.at(-1)?.invoice;
                      return (
                        <tr key={line.id} className={table.tr}>
                          <td className={`${table.td} ${table.primary}`}>
                            {line.label}
                            <span className={table.sub}>{line.status}</span>
                          </td>
                          <td className={table.td}>
                            <Link
                              href={`/clients/${line.project.client.slug}`}
                              className={table.link}
                            >
                              {line.project.client.name}
                            </Link>
                          </td>
                          <td className={table.td}>
                            <Link href={`/projects/${line.project.slug}`} className={table.link}>
                              {line.project.reference}
                            </Link>
                          </td>
                          <td className={`${table.td} ${table.nowrap}`}>
                            {formatShortDate(line.nextDueAt)}
                            <span className={table.sub}>
                              {days(line.nextDueAt!) < 0
                                ? `${Math.abs(days(line.nextDueAt!))} days ago`
                                : `in ${days(line.nextDueAt!)} days`}
                            </span>
                          </td>
                          <td className={`${table.td} ${table.nowrap}`}>
                            {KIND_LABEL[line.billingKind] ?? line.billingKind}
                          </td>
                          <td className={`${table.td} ${table.numeric}`}>
                            {line.amountMinor === 0 ? (
                              <span className={table.muted}>No price</span>
                            ) : (
                              formatMoney(line.amountMinor * line.quantity, line.currency)
                            )}
                          </td>
                          <td className={table.td}>
                            {latest ? (
                              <Link href={`/invoices/${latest.number}`} className={table.link}>
                                {latest.number}
                              </Link>
                            ) : (
                              <span className={`${forms.badge} ${forms.badgeWarn}`}>
                                Not invoiced
                              </span>
                            )}
                          </td>
                          <td className={`${table.td} ${table.actions}`}>
                            <span className={table.actionGroup}>
                              <Link
                                href={`/projects/${line.project.slug}`}
                                className={table.action}
                              >
                                Invoice it
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
        ))}
      </div>
    </main>
  );
}
