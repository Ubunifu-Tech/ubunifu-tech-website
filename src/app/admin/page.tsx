import Link from 'next/link';
import { db } from '@/lib/db';
import { requireStaff } from '@/lib/console/auth';
import { STAFF_LABEL, STATUS_TONE } from '@/lib/console/project-status';
import { formatMoney, formatRelative, formatShortDate } from '@/lib/console/money';
import { recentActivity } from '@/lib/console/activity';
import { ActivityFeed } from '@/components/console/ActivityFeed';
import { Avatar } from '@/components/console/Avatar';
import { StatCard } from '@/components/console/StatCard';
import { Briefcase, MailWarning, RefreshCw, Sparkles, UserPlus, Wallet } from 'lucide-react';
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
 * A row of figures that each open the list behind them, the things somebody
 * is waiting on — oldest first — and what happened lately. Every number on
 * this screen is something you can act on; none of it is a vanity total.
 */

/** Morning, afternoon or evening in Tanzania, not wherever the server is. */
function greeting(now: Date): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Africa/Dar_es_Salaam' }).format(now),
  );
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
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
    activity,
    enquiryCount,
    pipelineCount,
    myTasks,
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
    recentActivity(8),
    // Counted separately: the lists above are capped for the table, and a
    // capped length shown as a total would quietly read "10" when it is 14.
    db.enquiry.count({ where: { status: 'new' } }),
    db.project.count({
      where: {
        deletedAt: null,
        status: { in: ['lead', 'proposal_draft', 'client_review', 'proposal_sent'] },
      },
    }),
    db.deliverable.findMany({
      where: {
        assigneeId: staff.id,
        isComplete: false,
        phase: { project: { deletedAt: null, status: { notIn: ['closed', 'cancelled'] } } },
      },
      orderBy: [{ dueAt: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
      take: 8,
      select: {
        id: true,
        title: true,
        dueAt: true,
        phase: { select: { project: { select: { name: true, slug: true } } } },
      },
    })
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
      badge: 'New enquiry',
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

  const owed = [...owedByCurrency].filter(([, amount]) => amount > 0);
  const [firstCurrency, firstAmount] = owed[0] ?? ['USD', 0];
  const firstName = staff.name.split(' ')[0];

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <h1 className={styles.heading}>
            {greeting(now)}, {firstName}
          </h1>
          <p className={styles.lead}>
            {waiting.length === 0
              ? 'All clear — nothing needs you right now.'
              : `${waiting.length} ${waiting.length === 1 ? 'thing needs' : 'things need'} your attention.`}
          </p>
        </div>
        <Link href="/clients/new" className={forms.button}>
          Add a client
        </Link>
      </div>

      <div className={styles.stats}>
        <StatCard
          label="Active projects"
          value={liveProjects}
          hint={`${pipelineCount} more in the pipeline`}
          icon={Briefcase}
          tone="blue"
          href="/projects"
        />
        <StatCard
          label="Unpaid"
          value={formatMoney(firstAmount, firstCurrency)}
          hint={
            owed.length > 1
              ? `Plus ${owed
                  .slice(1)
                  .map(([currency, amount]) => formatMoney(amount, currency))
                  .join(' and ')}`
              : `${unpaidInvoices.length} ${unpaidInvoices.length === 1 ? 'invoice' : 'invoices'} open`
          }
          icon={Wallet}
          tone="amber"
          href="/invoices"
        />
        <StatCard
          label="New enquiries"
          value={enquiryCount}
          hint={enquiryCount === 0 ? 'Inbox is clear' : 'Waiting for a reply'}
          icon={Sparkles}
          tone="violet"
          href="/enquiries"
        />
        <StatCard
          label="Renewals due"
          value={dueRenewals}
          hint="In the next 45 days"
          icon={RefreshCw}
          tone="teal"
          href="/renewals"
        />
        {failedEmails > 0 ? (
          <StatCard
            label="Emails not sent"
            value={failedEmails}
            hint="See which ones"
            icon={MailWarning}
            tone="red"
            href="/activity?show=failures"
          />
        ) : (
          <StatCard
            label="Not invited yet"
            value={uninvited}
            hint="Clients without portal access"
            icon={UserPlus}
            tone="orange"
            href="/clients"
          />
        )}
      </div>

      <div className={styles.columns}>
        <div className={table.frame}>
          <div className={table.toolbar}>
            <div className={table.toolbarText}>
              <h2 className={table.title}>Needs your attention</h2>
              <span className={table.count}>{waiting.length}</span>
            </div>
          </div>
          <div className={table.scroll}>
            <table className={`${table.table} ${table.compact}`}>
              <thead>
                <tr>
                  <th className={table.th} scope="col">What</th>
                  <th className={table.th} scope="col">Client</th>
                  <th className={table.th} scope="col">Since</th>
                  <th className={table.th} scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {waiting.length === 0 ? (
                  <tr>
                    <td className={table.emptyCell} colSpan={4}>
                      <p className={table.emptyTitle}>You are all caught up</p>
                      <p className={table.emptyHint}>
                        {liveProjects} {liveProjects === 1 ? 'project is' : 'projects are'} moving
                        and nothing is waiting on you.
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
                      <td className={table.td}>
                        <span className={table.who}>
                          <Avatar name={item.who} size="sm" />
                          {item.who}
                        </span>
                      </td>
                      <td className={`${table.td} ${table.nowrap}`}>
                        {formatRelative(item.since, now)}
                        <span className={table.sub}>{formatShortDate(item.since)}</span>
                      </td>
                      <td className={table.td}>
                        <span className={`${forms.badge} ${item.tone}`}>{item.badge}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.stack}>
        <section className={forms.card}>
          <div className={forms.cardHeader}>
            <h2 className={forms.cardTitle}>Your tasks</h2>
            <span className={forms.cardMeta}>{myTasks.length === 0 ? 'Nothing assigned' : `${myTasks.length} open`}</span>
          </div>
          {myTasks.length === 0 ? (
            <p className={styles.note}>
              Nothing is assigned to you. Tasks are given out on each project&rsquo;s{' '}
              <Link href="/projects" className={styles.inlineLink}>
                plan
              </Link>
              .
            </p>
          ) : (
            <ul className={styles.glance}>
              {myTasks.map((task) => {
                const late = task.dueAt !== null && task.dueAt < now;
                return (
                  <li key={task.id}>
                    <Link href={`/projects/${task.phase.project.slug}?tab=plan`}>
                      <span className={styles.taskText}>
                        {task.title}
                        <span className={styles.taskMeta}>{task.phase.project.name}</span>
                      </span>
                      <span className={`${forms.badge} ${late ? forms.badgeBad : ''}`}>
                        {task.dueAt ? (late ? `Late, ${formatShortDate(task.dueAt)}` : formatShortDate(task.dueAt)) : 'No date'}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className={forms.card}>
          <div className={forms.cardHeader}>
            <h2 className={forms.cardTitle}>Recent activity</h2>
            <Link href="/activity" className={table.action}>
              See all
            </Link>
          </div>
          <ActivityFeed items={activity} now={now} />
        </section>
        </div>
      </div>
    </main>
  );
}
