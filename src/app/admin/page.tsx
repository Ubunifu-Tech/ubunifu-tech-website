import Link from 'next/link';
import { db } from '@/lib/db';
import { requireStaff } from '@/lib/console/auth';
import { STAFF_LABEL, STATUS_TONE } from '@/lib/console/project-status';
import { formatMoney, formatRelative, formatShortDate } from '@/lib/console/money';
import styles from './Admin.module.css';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';

// Absolute: a layout template does not apply to its own sibling page, so a
// plain string here would inherit the marketing site's title template.
export const metadata = { title: { absolute: 'Overview · Ubunifu Console' } };

const TONE_CLASS: Record<string, string> = {
  neutral: '',
  live: forms.badgeLive,
  good: forms.badgeGood,
  warn: forms.badgeWarn,
  bad: forms.badgeBad,
};

/**
 * The desk.
 *
 * One table of things somebody is waiting on, ordered by how long they have
 * been waiting, and a strip of numbers above it. Not a dashboard of totals: a
 * screen that opens on "48 completed tasks" is a screen that tells you nothing
 * you can act on, and it gets ignored by the second week.
 */
export default async function AdminHome() {
  const staff = await requireStaff();
  const now = new Date();
  const soon = new Date(now);
  soon.setDate(soon.getDate() + 45);

  const [
    newEnquiries,
    uninvited,
    unpaidInvoices,
    dueRenewals,
    failedEmails,
    waitingProjects,
    liveProjects,
  ] = await Promise.all([
    db.enquiry.findMany({
      where: { status: 'new' },
      orderBy: { createdAt: 'asc' },
      take: 10,
      select: { id: true, name: true, subject: true, createdAt: true },
    }),
    db.clientContact.count({
      where: { deletedAt: null, canSignIn: true, activatedAt: null, client: { deletedAt: null } },
    }),
    db.invoice.findMany({
      where: { status: { in: ['sent', 'part_paid', 'overdue'] } },
      orderBy: { dueAt: 'asc' },
      take: 10,
      select: {
        id: true,
        number: true,
        currency: true,
        totalMinor: true,
        paidMinor: true,
        dueAt: true,
        client: { select: { name: true } },
      },
    }),
    db.lineItem.count({
      where: {
        status: { in: ['planned', 'active'] },
        nextDueAt: { not: null, lte: soon },
        project: { deletedAt: null, status: { notIn: ['closed', 'cancelled'] } },
      },
    }),
    db.emailLog.count({ where: { status: 'failed' } }),
    db.project.findMany({
      where: {
        deletedAt: null,
        status: { in: ['lead', 'proposal_draft', 'client_review', 'proposal_sent'] },
      },
      orderBy: { updatedAt: 'asc' },
      take: 10,
      select: {
        id: true,
        name: true,
        slug: true,
        reference: true,
        status: true,
        updatedAt: true,
        client: { select: { name: true } },
      },
    }),
    db.project.count({
      where: {
        deletedAt: null,
        status: { in: ['contract_signed', 'in_progress', 'client_review', 'launch_ready'] },
      },
    }),
  ]);

  const owedByCurrency = new Map<string, number>();
  for (const invoice of unpaidInvoices) {
    const owed = Math.max(0, invoice.totalMinor - invoice.paidMinor);
    owedByCurrency.set(invoice.currency, (owedByCurrency.get(invoice.currency) ?? 0) + owed);
  }

  type Waiting = {
    id: string;
    what: string;
    who: string;
    since: Date;
    href: string;
    badge: string;
    tone: string;
  };

  const waiting: Waiting[] = [
    ...newEnquiries.map((enquiry) => ({
      id: `e-${enquiry.id}`,
      what: enquiry.subject,
      who: enquiry.name,
      since: enquiry.createdAt,
      href: `/enquiries?open=${enquiry.id}`,
      badge: 'Unread enquiry',
      tone: forms.badgeWarn,
    })),
    ...waitingProjects.map((project) => ({
      id: `p-${project.id}`,
      what: project.name,
      who: project.client.name,
      since: project.updatedAt,
      href: `/projects/${project.slug}`,
      badge: STAFF_LABEL[project.status],
      tone: TONE_CLASS[STATUS_TONE[project.status]],
    })),
    ...unpaidInvoices
      .filter((invoice) => invoice.dueAt !== null && invoice.dueAt.getTime() < now.getTime())
      .map((invoice) => ({
        id: `i-${invoice.id}`,
        what: `${invoice.number} — ${formatMoney(
          invoice.totalMinor - invoice.paidMinor,
          invoice.currency,
        )} outstanding`,
        who: invoice.client.name,
        since: invoice.dueAt!,
        href: `/invoices/${invoice.number}`,
        badge: 'Overdue',
        tone: forms.badgeBad,
      })),
  ].sort((a, b) => a.since.getTime() - b.since.getTime());

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <h1 className={styles.heading}>
            Good to see you,{' '}
            <span className={styles.headingAccent}>{staff.name.split(' ')[0]}</span>
          </h1>
          <p className={styles.lead}>
            {waiting.length === 0
              ? 'Nothing is waiting on you. Everything that has come in has been picked up.'
              : 'Oldest first, because the thing that has been waiting longest is usually the one that costs something.'}
          </p>
        </div>
        <Link href="/clients/new" className={forms.button}>
          Add a client
        </Link>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <p className={styles.statLabel}>In flight</p>
          <p className={styles.statValue}>{liveProjects}</p>
          <p className={styles.statHint}>Projects being worked on</p>
        </div>
        {[...owedByCurrency].map(([currency, owed]) => (
          <div key={currency} className={`${styles.stat} ${owed > 0 ? styles.statAlert : ''}`}>
            <p className={styles.statLabel}>Owed in {currency}</p>
            <p className={styles.statValue}>{formatMoney(owed, currency)}</p>
            <p className={styles.statHint}>Invoiced and not settled</p>
          </div>
        ))}
        <div className={styles.stat}>
          <p className={styles.statLabel}>Renewals near</p>
          <p className={styles.statValue}>{dueRenewals}</p>
          <p className={styles.statHint}>Due within 45 days</p>
        </div>
        <div className={styles.stat}>
          <p className={styles.statLabel}>Never invited</p>
          <p className={styles.statValue}>{uninvited}</p>
          <p className={styles.statHint}>Contacts with no portal account</p>
        </div>
        {failedEmails > 0 && (
          <div className={`${styles.stat} ${styles.statAlert}`}>
            <p className={styles.statLabel}>Emails that failed</p>
            <p className={styles.statValue}>{failedEmails}</p>
            <p className={styles.statHint}>
              <Link href="/activity?show=failures">The record survived — see which</Link>
            </p>
          </div>
        )}
      </div>

      <div className={table.frame}>
        <div className={table.toolbar}>
          <div className={table.toolbarText}>
            <h2 className={table.title}>Waiting on us</h2>
            <span className={table.count}>
              {waiting.length} {waiting.length === 1 ? 'thing' : 'things'}
            </span>
          </div>
        </div>
        <div className={table.scroll}>
          <table className={table.table}>
            <thead>
              <tr>
                <th className={table.th} scope="col">What</th>
                <th className={table.th} scope="col">Who</th>
                <th className={table.th} scope="col">Waiting since</th>
                <th className={table.th} scope="col">State</th>
                <th className={`${table.th} ${table.actionsHead}`} scope="col">
                  <span className={table.muted}>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {waiting.length === 0 ? (
                <tr>
                  <td className={table.emptyCell} colSpan={5}>
                    <p className={table.emptyTitle}>A clear desk.</p>
                    <p className={table.emptyHint}>
                      {liveProjects} project{liveProjects === 1 ? ' is' : 's are'} in flight and
                      nothing needs a decision today.
                    </p>
                  </td>
                </tr>
              ) : (
                waiting.map((item) => (
                  <tr key={item.id} className={table.tr}>
                    <td className={`${table.td} ${table.primary}`}>
                      <Link href={item.href} className={table.link}>
                        {item.what}
                      </Link>
                    </td>
                    <td className={table.td}>{item.who}</td>
                    <td className={`${table.td} ${table.nowrap}`}>
                      {formatShortDate(item.since)}
                      <span className={table.sub}>{formatRelative(item.since, now)}</span>
                    </td>
                    <td className={table.td}>
                      <span className={`${forms.badge} ${item.tone}`}>{item.badge}</span>
                    </td>
                    <td className={`${table.td} ${table.actions}`}>
                      <span className={table.actionGroup}>
                        <Link href={item.href} className={table.action}>
                          Open
                        </Link>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
