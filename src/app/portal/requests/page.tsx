import Link from 'next/link';
import { db } from '@/lib/db';
import { requireClient } from '@/lib/console/auth';
import { liveTicket } from '@/lib/console/live';
import { CLIENT_TICKET_STATUS, TICKET_KIND_LABEL } from '@/lib/console/tickets';
import { formatRelative, formatShortDate } from '@/lib/console/money';
import { RaiseRequestForm } from './RequestForms';
import styles from '../Portal.module.css';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';

export const metadata = { title: 'Requests' };

const STATUS_BADGE: Record<string, string> = {
  open: forms.badgeWarn,
  triaged: '',
  in_progress: forms.badgeLive,
  waiting_on_client: forms.badgeWarn,
  resolved: forms.badgeGood,
  closed: '',
};

export default async function PortalRequests() {
  const actor = await requireClient();
  const now = new Date();

  const [tickets, projects] = await Promise.all([
    db.ticket.findMany({
      where: { clientId: actor.clientId, ...liveTicket },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        reference: true,
        subject: true,
        kind: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        project: { select: { name: true } },
        messages: { where: { isInternal: false }, select: { id: true } },
      },
    }),
    db.project.findMany({
      where: { clientId: actor.clientId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true },
    }),
  ]);

  const openCount = tickets.filter(
    (ticket) => !['resolved', 'closed'].includes(ticket.status),
  ).length;

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <h1 className={styles.heading}>
          Ask us for <span className={styles.headingAccent}>something</span>
        </h1>
        <p className={styles.lead}>
          A change to the site, new content, something broken, or a question. Everything you send
          is kept here with our replies, so nothing gets lost in an email thread.
        </p>
      </div>

      <section className={forms.card}>
        <div className={forms.cardHeader}>
          <h2 className={forms.cardTitle}>New request</h2>
          <span className={forms.cardMeta}>We read these every working day</span>
        </div>
        <RaiseRequestForm projects={projects} />
      </section>

      <div className={table.frame}>
        <div className={table.toolbar}>
          <div className={table.toolbarText}>
            <h2 className={table.title}>Everything you have asked us</h2>
            <span className={table.count}>
              {openCount === 0
                ? 'Nothing outstanding'
                : `${openCount} still open`}
            </span>
          </div>
        </div>
        <div className={table.scroll}>
          <table className={table.table}>
            <thead>
              <tr>
                <th className={table.th} scope="col">Request</th>
                <th className={table.th} scope="col">Kind</th>
                <th className={table.th} scope="col">About</th>
                <th className={table.th} scope="col">Where it stands</th>
                <th className={table.th} scope="col">Last activity</th>
                <th className={`${table.th} ${table.actionsHead}`} scope="col">
                  <span className={table.muted}>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {tickets.length === 0 ? (
                <tr>
                  <td className={table.emptyCell} colSpan={6}>
                    <p className={table.emptyTitle}>You have not asked us for anything yet.</p>
                    <p className={table.emptyHint}>
                      Use the form above and it will appear here.
                    </p>
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr key={ticket.id} className={table.tr}>
                    <td className={`${table.td} ${table.primary}`}>
                      <Link href={`/portal/requests/${ticket.reference}`} className={table.link}>
                        {ticket.subject}
                      </Link>
                      <span className={table.sub}>
                        {ticket.reference} · {ticket.messages.length}{' '}
                        {ticket.messages.length === 1 ? 'message' : 'messages'}
                      </span>
                    </td>
                    <td className={`${table.td} ${table.nowrap}`}>
                      {TICKET_KIND_LABEL[ticket.kind]}
                    </td>
                    <td className={table.td}>
                      {ticket.project?.name ?? <span className={table.muted}>General</span>}
                    </td>
                    <td className={table.td}>
                      <span className={`${forms.badge} ${STATUS_BADGE[ticket.status]}`}>
                        {CLIENT_TICKET_STATUS[ticket.status]}
                      </span>
                    </td>
                    <td className={`${table.td} ${table.nowrap}`}>
                      {formatShortDate(ticket.updatedAt)}
                      <span className={table.sub}>{formatRelative(ticket.updatedAt, now)}</span>
                    </td>
                    <td className={`${table.td} ${table.actions}`}>
                      <span className={table.actionGroup}>
                        <Link
                          href={`/portal/requests/${ticket.reference}`}
                          className={table.action}
                        >
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
