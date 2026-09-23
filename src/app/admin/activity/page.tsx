import Link from 'next/link';
import { db } from '@/lib/db';
import type { Prisma } from '@/generated/prisma/client';
import { requireStaff } from '@/lib/console/auth';
import { formatShortDate } from '@/lib/console/money';
import { Callout } from '@/components/console/Callout';
import { ListToolbar } from '@/components/console/ListToolbar';
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

const ACTION_LABEL: Record<string, string> = {
  'client.created': 'Client created',
  'client.invite.sent': 'Portal invitation sent',
  'client.invite.send_failed': 'Invitation could not be sent',
  'client.invite.opened': 'Invitation opened',
  'client.account.activated': 'Client set up their account',
  'client.sign_in.success': 'Client signed in',
  'client.sign_in.failed': 'Failed client sign-in',
  'client.sign_in.locked': 'Account locked',
  'client.sign_in.throttled': 'Too many link requests',
  'client.sign_in.link_sent': 'Sign-in link sent',
  'client.sign_in.rejected_at_use': 'Link refused: access had been removed',
  'client.sign_out': 'Client signed out',
  'staff.sign_in.success': 'Staff signed in',
  'staff.sign_in.link_sent': 'Staff link sent',
  'staff.sign_out': 'Staff signed out',
  'enquiry.status_changed': 'Enquiry moved',
  'enquiry.note_saved': 'Enquiry note saved',
  'project.status_changed': 'Project moved',
  'line_item.saved': 'Fee line updated',
  'deliverable.completed': 'Item ticked off',
  'deliverable.reopened': 'Item reopened',
  'asset_request.status_changed': 'Client request updated',
  'invoice.created': 'Invoice raised',
  'invoice.sent': 'Invoice sent',
  'invoice.voided': 'Invoice voided',
  'payment.recorded': 'Payment recorded',
  'receipt.sent': 'Receipt sent',
  'project_update.drafted': 'Update drafted',
  'project_update.sent': 'Update sent to the client',
  'project_update.send_failed': 'Update email did not send',
  'settings.billing_saved': 'Billing details changed',
  'assistant.failed': 'Assistant could not answer',
};

function auditWhere(key: string): Prisma.AuditEventWhereInput | null {
  switch (key) {
    case 'emails':
    case 'failures':
      return null;
    case 'money':
      return { OR: [{ action: { startsWith: 'invoice.' } }, { action: { startsWith: 'payment.' } }, { action: { startsWith: 'receipt.' } }, { action: { startsWith: 'line_item.' } }] };
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
  await requireStaff();
  const { show } = await searchParams;
  const active = FILTERS.some((f) => f.key === show) ? show! : 'all';

  const where = auditWhere(active);
  const wantsEmails = active === 'all' || active === 'emails' || active === 'failures';

  const emailWhere = (key: string): Prisma.EmailLogWhereInput | null =>
    key === 'failures' ? { status: 'failed' } : key === 'all' || key === 'emails' ? {} : null;

  // How many entries each view holds, audit lines and emails together.
  const viewCounts = await Promise.all(
    FILTERS.map(async (filter) => {
      const audit = auditWhere(filter.key);
      const email = emailWhere(filter.key);
      const [a, e] = await Promise.all([
        audit === null ? 0 : db.auditEvent.count({ where: audit }),
        email === null ? 0 : db.emailLog.count({ where: email }),
      ]);
      return a + e;
    }),
  );
  const total = viewCounts[FILTERS.findIndex((f) => f.key === active)] ?? 0;

  const [audits, emails, failedCount] = await Promise.all([
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
            ip: true,
            createdAt: true,
          },
        }),
    wantsEmails
      ? db.emailLog.findMany({
          where: active === 'failures' ? { status: 'failed' } : {},
          orderBy: { createdAt: 'desc' },
          take: 150,
          select: {
            id: true,
            toAddress: true,
            subject: true,
            template: true,
            status: true,
            error: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]),
    db.emailLog.count({ where: { status: 'failed' } }),
  ]);

  type Row = {
    id: string;
    at: Date;
    what: string;
    detail: string;
    who: string;
    kind: 'Action' | 'Email';
    bad: boolean;
    note?: string | null;
  };

  const rows: Row[] = [
    ...audits.map((audit) => ({
      id: `a-${audit.id}`,
      at: audit.createdAt,
      what: ACTION_LABEL[audit.action] ?? audit.action.replace(/[._]/g, ' '),
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
    })),
    ...emails.map((email) => ({
      id: `e-${email.id}`,
      at: email.createdAt,
      what: email.status === 'sent' ? 'Email delivered' : 'Email did not send',
      detail: `${email.subject} → ${email.toAddress}`,
      who: 'System',
      kind: 'Email' as const,
      bad: email.status !== 'sent',
      note: email.error,
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
          {failedCount} {failedCount === 1 ? 'email' : 'emails'} did not send. The people they
          were for have not heard from us.
        </Callout>
      )}

      <div className={table.frame}>
        <ListToolbar
          path="/activity"
          views={FILTERS.map((filter, index) => ({ ...filter, count: viewCounts[index] ?? 0 }))}
          current={active}
          defaultView="all"
        />

        <div className={table.scroll}>
          <table className={table.table}>
            <thead>
              <tr>
                <th className={table.th} scope="col">When</th>
                <th className={table.th} scope="col">What</th>
                <th className={table.th} scope="col">Detail</th>
                <th className={table.th} scope="col">By</th>
                <th className={table.th} scope="col">Kind</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className={table.emptyCell} colSpan={5}>
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
                        {formatShortDate(row.at)}
                      </time>
                      <span className={table.sub}>
                        {new Intl.DateTimeFormat('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'UTC',
                        }).format(row.at)}{' '}
                        UTC
                      </span>
                    </td>
                    <td className={`${table.td} ${table.primary}`}>
                      {row.what}
                      {row.note && <span className={table.sub}>{row.note}</span>}
                    </td>
                    <td className={table.td}>
                      <span className={table.clamp}>{row.detail}</span>
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
