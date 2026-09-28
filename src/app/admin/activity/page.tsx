import Link from 'next/link';
import { db } from '@/lib/db';
import type { Prisma } from '@/generated/prisma/client';
import { can, requireStaff } from '@/lib/console/auth';
import { formatShortDate, formatTime } from '@/lib/console/money';
import {
  actionLabel,
  actionStartsWith,
  hiddenFrom,
  readableSummary,
  templateStartsWith,
  whoDid,
} from '@/lib/console/activity';
import { Callout } from '@/components/console/Callout';
import { isStuck, unresolvedEmailFailures } from '@/lib/console/email-failures';
import { linkFor, recordLinks } from '@/lib/console/record-links';
import { ListToolbar } from '@/components/console/ListToolbar';
import { PAGE_SIZE, pageHref } from '@/lib/console/paging';
import styles from '../Admin.module.css';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';

export const metadata = { title: 'Activity' };

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

const AUDIT_ROW = {
  id: true,
  action: true,
  summary: true,
  actorType: true,
  actorId: true,
  entityType: true,
  entityId: true,
  ip: true,
  createdAt: true,
} satisfies Prisma.AuditEventSelect;

const EMAIL_ROW = {
  id: true,
  toAddress: true,
  subject: true,
  template: true,
  status: true,
  error: true,
  entityType: true,
  entityId: true,
  createdAt: true,
} satisfies Prisma.EmailLogSelect;

/** A moment from the address, or null when it is missing or unreadable. */
function moment(value: string | string[] | undefined): Date | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const at = new Date(raw);
  return Number.isNaN(at.getTime()) ? null : at;
}

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
  searchParams: Promise<{ show?: string; before?: string; after?: string }>;
}) {
  const staff = await requireStaff();
  const { show, before, after } = await searchParams;

  // Lines and emails about money or documents are left out for anyone who
  // cannot see those, the same as the pages they would link to.
  const hidden = hiddenFrom(staff);
  const seesMoney = can(staff, 'invoices') || can(staff, 'fees') || can(staff, 'finance');
  const filters = FILTERS.filter((filter) => filter.key !== 'money' || seesMoney);
  const active = filters.some((f) => f.key === show) ? show! : 'all';

  const visible = (where: Prisma.AuditEventWhereInput | null) =>
    where === null || hidden.actions.length === 0
      ? where
      : { AND: [where, { NOT: actionStartsWith(hidden.actions) }] };
  const where = visible(auditWhere(active));

  // Failed sends that have not been put right by sending again since.
  const failures = await unresolvedEmailFailures(staff);
  const failureIds = failures.map((row) => row.id);

  // The failures view is already limited to what this person can send again.
  const emailWhere = (key: string): Prisma.EmailLogWhereInput | null =>
    key === 'failures'
      ? { id: { in: failureIds } }
      : key === 'all' || key === 'emails'
        ? hidden.emails.length
          ? { NOT: templateStartsWith(hidden.emails) }
          : {}
        : null;
  const emailsShown = emailWhere(active);

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

  /**
   * Pages are cut by time rather than by position, because the list is two
   * tables merged. ?before= shows the page just older than a moment, ?after=
   * the page just newer than it, and neither shows the newest. Each table
   * reads one more than a page, so the merged cut is right whichever table
   * the entries came from. A page never ends partway through entries that
   * share one moment, since the next page starts strictly before or after it.
   */
  const olderThan = moment(before);
  const newerThan = olderThan ? null : moment(after);
  const cursor = olderThan ?? newerThan;
  const rising = newerThan !== null;
  const order = rising ? ('asc' as const) : ('desc' as const);
  const within = <W extends object>(
    base: W,
    createdAt: Prisma.DateTimeFilter | Date | undefined,
  ) => (createdAt === undefined ? base : { AND: [base, { createdAt }] });
  const span = olderThan ? { lt: olderThan } : newerThan ? { gt: newerThan } : undefined;

  const [auditsRead, emailsRead] = await Promise.all([
    where === null
      ? Promise.resolve([])
      : db.auditEvent.findMany({
          where: within(where, span),
          orderBy: [{ createdAt: order }, { id: order }],
          take: PAGE_SIZE + 1,
          select: AUDIT_ROW,
        }),
    emailsShown === null
      ? Promise.resolve([])
      : db.emailLog.findMany({
          where: within(emailsShown, span),
          orderBy: [{ createdAt: order }, { id: order }],
          take: PAGE_SIZE + 1,
          select: EMAIL_ROW,
        }),
  ]);

  // Both tables in the order of the walk, cut after a page and after any
  // further entries from the same moment as the last one kept.
  const walk = (a: Date, b: Date) =>
    rising ? a.getTime() - b.getTime() : b.getTime() - a.getTime();
  const merged = [...auditsRead, ...emailsRead].sort((a, b) => walk(a.createdAt, b.createdAt));
  const edge = merged.length > PAGE_SIZE ? merged[PAGE_SIZE - 1]!.createdAt : null;
  const keep = <R extends { createdAt: Date }>(rows: R[]) =>
    edge ? rows.filter((row) => walk(row.createdAt, edge) <= 0) : rows;
  // A table that filled its read on that same moment may hold more from it.
  const endsOnEdge = (rows: { createdAt: Date }[]) =>
    edge !== null &&
    rows.length > PAGE_SIZE &&
    rows[rows.length - 1]!.createdAt.getTime() === edge.getTime();
  const [auditsAtEdge, emailsAtEdge] = await Promise.all([
    where !== null && endsOnEdge(auditsRead)
      ? db.auditEvent.findMany({
          where: within(where, edge!),
          orderBy: { id: order },
          select: AUDIT_ROW,
        })
      : Promise.resolve([]),
    emailsShown !== null && endsOnEdge(emailsRead)
      ? db.emailLog.findMany({
          where: within(emailsShown, edge!),
          orderBy: { id: order },
          select: EMAIL_ROW,
        })
      : Promise.resolve([]),
  ]);
  const withEdge = <R extends { id: string; createdAt: Date }>(rows: R[], extra: R[]) => {
    const kept = keep(rows);
    const ids = new Set(kept.map((row) => row.id));
    return [...kept, ...extra.filter((row) => !ids.has(row.id))];
  };
  const audits = withEdge(auditsRead, auditsAtEdge);
  const emails = withEdge(emailsRead, emailsAtEdge);

  // What lies either side of the page, for the links under it.
  const times = [...audits, ...emails].map((row) => row.createdAt.getTime());
  const newest = times.length ? new Date(Math.max(...times)) : null;
  const oldest = times.length ? new Date(Math.min(...times)) : null;
  const anyWhere = async (createdAt: Prisma.DateTimeFilter) => {
    const [audit, email] = await Promise.all([
      where === null
        ? null
        : db.auditEvent.findFirst({ where: within(where, createdAt), select: { id: true } }),
      emailsShown === null
        ? null
        : db.emailLog.findFirst({ where: within(emailsShown, createdAt), select: { id: true } }),
    ]);
    return audit !== null || email !== null;
  };
  const [hasNewer, hasOlder] = await Promise.all([
    cursor && newest ? anyWhere({ gt: newest }) : false,
    oldest ? anyWhere({ lt: oldest }) : false,
  ]);
  const view = active === 'all' ? undefined : active;
  const newestHref = pageHref('/activity', { show: view }, 1);
  const newerHref = newest && pageHref('/activity', { show: view, after: newest.toISOString() }, 1);
  const olderHref = oldest && pageHref('/activity', { show: view, before: oldest.toISOString() }, 1);

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

  const who = await whoDid(audits);
  const rows: Row[] = [
    ...audits.map((audit) => ({
      id: `a-${audit.id}`,
      at: audit.createdAt,
      what: actionLabel(audit.action),
      detail: audit.summary ? readableSummary(audit.action, audit.summary) : audit.entityType,
      who: who(audit),
      kind: 'Action' as const,
      bad:
        audit.action.includes('failed') ||
        audit.action.includes('locked') ||
        audit.action.includes('voided'),
      href: linkFor(links, audit),
    })),
    ...emails.map((email) => {
      // Stuck: still queued long after the mail service should have answered.
      const stuck = isStuck(email);
      return {
        id: `e-${email.id}`,
        at: email.createdAt,
        // Sent means the mail service accepted it. Whether it then reached the
        // inbox is not something we are told, so it is not claimed.
        what:
          email.status === 'sent'
            ? 'Email sent'
            : stuck
              ? 'Email not confirmed'
              : email.status === 'queued'
                ? 'Email not sent yet'
                : 'Email did not send',
        detail: `${email.subject} → ${email.toAddress}`,
        who: 'System',
        kind: 'Email' as const,
        bad: email.status === 'failed' || stuck,
        note: email.error ?? (stuck ? 'No answer from the mail service' : null),
        href: linkFor(links, email),
      };
    }),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  const entries = (count: number) => `${count} ${count === 1 ? 'entry' : 'entries'}`;
  const shownText =
    !cursor && !hasOlder
      ? `${entries(total)}.`
      : newest && oldest
        ? formatShortDate(newest) === formatShortDate(oldest)
          ? `${entries(rows.length)} on ${formatShortDate(newest)}, of ${total}.`
          : `${entries(rows.length)} from ${formatShortDate(newest)} back to ${formatShortDate(oldest)}, of ${total}.`
        : `${entries(total)} in this view.`;

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
                      {cursor
                        ? 'Nothing recorded from then.'
                        : active === 'failures'
                          ? 'Every email has gone out.'
                          : 'Nothing recorded in this view.'}
                    </p>
                    <p className={table.emptyHint}>
                      {cursor
                        ? 'Go to the newest entries.'
                        : active === 'failures'
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
                        {formatShortDate(row.at)}, {formatTime(row.at)}
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
        {(rows.length > 0 || cursor) && (
          <nav className={table.footer} aria-label="Pages of the record">
            <span>{shownText} Nothing here is ever edited or deleted.</span>
            <span className={table.pager}>
              {cursor && (
                <Link href={newestHref} className={table.action}>
                  Newest
                </Link>
              )}
              {hasNewer && newerHref && (
                <Link href={newerHref} className={table.action} rel="prev">
                  Newer
                </Link>
              )}
              {hasOlder && olderHref && (
                <Link href={olderHref} className={table.action} rel="next">
                  Older
                </Link>
              )}
            </span>
          </nav>
        )}
      </div>
    </main>
  );
}
