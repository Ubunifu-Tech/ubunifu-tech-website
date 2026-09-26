import Link from 'next/link';
import { db } from '@/lib/db';
import type { Prisma } from '@/generated/prisma/client';
import { can, requireStaff } from '@/lib/console/auth';
import { formatShortDate } from '@/lib/console/money';
import { actionLabel, actionStartsWith, moneyActionsHiddenFrom } from '@/lib/console/activity';
import { Callout } from '@/components/console/Callout';
import { unresolvedEmailFailures } from '@/lib/console/email-failures';
import { linkFor, recordLinks } from '@/lib/console/record-links';
import { ListToolbar } from '@/components/console/ListToolbar';
import styles from '../Admin.module.css';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';

export const metadata = { title: 'Activity' };

/** The time of day where the team works. */
const TIME = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Africa/Dar_es_Salaam',
});

/**
 * The whole record, as a table rather than a stream.
 *
 * One screen for both AuditEvent and EmailLog, because staff do not think of
 * "who changed this" and "did the email arrive" as separate questions. A
 * filtered view is a pasteable link — the filter lives in the URL, not in
 * client state — so "here is the proof we sent it" is a message you can send
 * to a colleague.
 *
 * The failures view exists because an email that did not send is the one row
 * here that is a task rather than a fact.
 */
const FILTERS = [
  { key: 'all', label: 'Everything' },
  { key: 'emails', label: 'Emails' },
  { key: 'failures', label: 'Failed sends' },
  { key: 'money', label: 'Money' },
  { key: 'access', label: 'Sign-ins' },
] as const;


function auditWhere(key: string): Prisma.AuditEventWhereInput | null {
  switch (key) {
    case 'emails':
    case 'failures':
      return null;
    case 'money':
      return actionStartsWith([
        'invoice.',
        'payment.',
        'receipt.',
        'refund.',
        'line_item.',
        'cost.',
        'regular_cost.',
        'exchange_rate.',
        'income.',
        'product.',
      ]);
    case 'access':
      return { action: { contains: 'sign_in' } };
    default:
      return {};
  }
}

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string }>;
}) {
  const staff = await requireStaff();
  const { show } = await searchParams;

  // Amounts are in these lines, so they are left out for anyone who cannot
  // see money, the same as the pages they would link to.
  const hidden = moneyActionsHiddenFrom(staff);
  const seesMoney = can(staff, 'invoices') || can(staff, 'fees') || can(staff, 'finance');
  const filters = FILTERS.filter((filter) => filter.key !== 'money' || seesMoney);
  const active = filters.some((f) => f.key === show) ? show! : 'all';

  const visible = (where: Prisma.AuditEventWhereInput | null) =>
    where === null || hidden.length === 0
      ? where
      : { AND: [where, { NOT: actionStartsWith(hidden) }] };
  const where = visible(auditWhere(active));
  const wantsEmails = active === 'all' || active === 'emails' || active === 'failures';

  // Failed sends that have not been put right by sending again since.
  const failures = await unresolvedEmailFailures(staff);
  const failureIds = failures.map((row) => row.id);

  const emailWhere = (key: string): Prisma.EmailLogWhereInput | null =>
    key === 'failures'
      ? { id: { in: failureIds } }
      : key === 'all' || key === 'emails'
        ? {}
        : null;

  // How many entries each view holds, audit lines and emails together.
  const viewCounts = await Promise.all(
    filters.map(async (filter) => {
      const audit = visible(auditWhere(filter.key));
      const email = emailWhere(filter.key);
      const [a, e] = await Promise.all([
        audit === null ? 0 : db.auditEvent.count({ where: audit }),
        email === null ? 0 : db.emailLog.count({ where: email }),
      ]);
      return a + e;
    }),
  );
  const total = viewCounts[filters.findIndex((f) => f.key === active)] ?? 0;

  const failedCount = failures.length;
  const [audits, emails] = await Promise.all([
    where === null
      ? Promise.resolve([])
      : db.auditEvent.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: 150,
          select: {
            id: true,
            action: true,
            summary: true,
            actorType: true,
            entityType: true,
            entityId: true,
            ip: true,
            createdAt: true,
          },
        }),
    wantsEmails
      ? db.emailLog.findMany({
          where: active === 'failures' ? { id: { in: failureIds } } : {},
          orderBy: { createdAt: 'desc' },
          take: 150,
          select: {
            id: true,
            toAddress: true,
            subject: true,
            template: true,
            status: true,
            error: true,
            entityType: true,
            entityId: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]),
  ]);
  const links = await recordLinks([...audits, ...emails], staff);

  type Row = {
    id: string;
    at: Date;
    what: string;
    detail: string;
    who: string;
    kind: 'Action' | 'Email';
    bad: boolean;
    note?: string | null;
    /** The record the line is about, when it can still be opened. */
    href: string | null;
  };

  const rows: Row[] = [
    ...audits.map((audit) => ({
      id: `a-${audit.id}`,
      at: audit.createdAt,
      what: actionLabel(audit.action),
      detail: audit.summary ?? audit.entityType,
      who:
        audit.actorType === 'staff'
          ? 'Us'
          : audit.actorType === 'client_contact'
            ? 'Client'
            : 'System',
      kind: 'Action' as const,
      bad:
        audit.action.includes('failed') ||
        audit.action.includes('locked') ||
        audit.action.includes('voided'),
      href: linkFor(links, audit),
    })),
    ...emails.map((email) => ({
      id: `e-${email.id}`,
      at: email.createdAt,
      // Sent means the mail service accepted it. Whether it then reached the
      // inbox is not something we are told, so it is not claimed.
      what:
        email.status === 'sent'
          ? 'Email sent'
          : email.status === 'queued'
            ? 'Email not sent yet'
            : 'Email did not send',
      detail: `${email.subject} → ${email.toAddress}`,
      who: 'System',
      kind: 'Email' as const,
      bad: email.status === 'failed',
      note: email.error,
      href: linkFor(links, email),
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 200);

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <h1 className={styles.heading}>
            The <span className={styles.headingAccent}>record</span>
          </h1>
          <p className={styles.lead}>
            Every action and every email, newest first.
          </p>
        </div>
      </div>

      {failedCount > 0 && active !== 'failures' && (
        <Callout
          kind="bad"
          action={
            <Link href="/activity?show=failures" className={table.action}>
              See which ones
            </Link>
          }
        >
          {failedCount} {failedCount === 1 ? 'email' : 'emails'} did not send and{' '}
          {failedCount === 1 ? 'has' : 'have'} not been sent since. Open each one to send it again.
        </Callout>
      )}

      <div className={table.frame}>
        <ListToolbar
          path="/activity"
          views={filters.map((filter, index) => ({ ...filter, count: viewCounts[index] ?? 0 }))}
          current={active}
          defaultView="all"
        />

        <div className={table.scroll}>
          <table className={table.table}>
            <thead>
              <tr>
                <th className={table.th} scope="col">When</th>
                <th className={table.th} scope="col">What</th>
                {active === 'failures' && (
                  <th className={table.th} scope="col">
                    Why
                  </th>
                )}
                <th className={table.th} scope="col">Detail</th>
                <th className={table.th} scope="col">By</th>
                <th className={table.th} scope="col">Kind</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className={table.emptyCell} colSpan={active === 'failures' ? 6 : 5}>
                    <p className={table.emptyTitle}>
                      {active === 'failures'
                        ? 'Every email has gone out.'
                        : 'Nothing recorded in this view.'}
                    </p>
                    <p className={table.emptyHint}>
                      {active === 'failures'
                        ? 'Nothing here is the good outcome.'
                        : 'Try another view.'}
                    </p>
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className={table.tr}>
                    <td className={`${table.td} ${table.nowrap}`}>
                      <time dateTime={row.at.toISOString()} title={row.at.toISOString()}>
                        {formatShortDate(row.at)}, {TIME.format(row.at)}
                      </time>
                    </td>
                    <td
                      className={`${table.td} ${table.primary}`}
                      title={active === 'failures' ? undefined : (row.note ?? undefined)}
                    >
                      {row.what}
                    </td>
                    {active === 'failures' && (
                      <td className={table.td}>
                        <span className={table.clamp}>{row.note ?? 'No reason given'}</span>
                      </td>
                    )}
                    <td className={table.td}>
                      {row.href ? (
                        <Link href={row.href} className={`${table.link} ${table.clamp}`}>
                          {row.detail}
                        </Link>
                      ) : (
                        <span className={table.clamp}>{row.detail}</span>
                      )}
                    </td>
                    <td className={`${table.td} ${table.nowrap}`}>{row.who}</td>
                    <td className={table.td}>
                      <span className={`${forms.badge} ${row.bad ? forms.badgeBad : ''}`}>
                        {row.kind}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {rows.length > 0 && (
          <div className={table.footer}>
            <span>
              {rows.length < total
                ? `Showing the latest ${rows.length} of ${total}.`
                : `${total} ${total === 1 ? 'entry' : 'entries'}.`}
            </span>
            <span>Nothing here is ever edited or deleted.</span>
          </div>
        )}
      </div>
    </main>
  );
}
