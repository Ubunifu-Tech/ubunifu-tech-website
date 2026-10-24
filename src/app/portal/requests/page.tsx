import Link from 'next/link';
import { db } from '@/lib/db';
import { requireClient } from '@/lib/console/auth';
import { liveTicket } from '@/lib/console/live';
import { CLIENT_TICKET_STATUS, TICKET_KIND_LABEL } from '@/lib/console/tickets';
import { formatShortDate } from '@/lib/console/money';
import { RaiseRequestForm } from './RequestForms';
import styles from '../Portal.module.css';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';

export const metadata = { title: 'Requests' };

// Amber only when the next move is the client's.
const STATUS_BADGE: Record<string, string> = {
  open: '',
  triaged: '',
  in_progress: forms.badgeLive,
  waiting_on_client: forms.badgeWarn,
  resolved: forms.badgeGood,
  closed: '',
};

export default async function PortalRequests({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; subject?: string; project?: string }>;
}) {
  const actor = await requireClient();
  const asked = await searchParams;

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
          Your <span className={styles.headingAccent}>requests</span>
        </h1>
        <p className={styles.lead}>
          Ask for a change, new content or a fix, or send us a question, and we will reply here.
        </p>
      </div>

      <section id="new-request" className={forms.card}>
        <div className={forms.cardHeader}>
          <h2 className={forms.cardTitle}>New request</h2>
          <span className={forms.cardMeta}>We read these every working day</span>
        </div>
        <RaiseRequestForm
          projects={projects}
          defaults={{
            kind: asked.kind,
            subject: asked.subject?.slice(0, 160),
            projectId: asked.project,
          }}
        />
      </section>

      <div className={table.frame}>
        <div className={table.toolbar}>
          <div className={table.toolbarText}>
            <h2 className={table.title}>All requests</h2>
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
                <th className={table.th} scope="col">Number</th>
                <th className={table.th} scope="col">Kind</th>
                <th className={table.th} scope="col">About</th>
                <th className={table.th} scope="col">Status</th>
                <th className={table.th} scope="col">Last activity</th>
                <th className={`${table.th} ${table.actionsHead}`} scope="col">
                  <span className={table.muted}>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {tickets.length === 0 ? (
                <tr>
                  <td className={table.emptyCell} colSpan={7}>
                    <p className={table.emptyTitle}>No requests yet.</p>
                    <p className={table.emptyHint}>
                      Requests you send appear here.
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
                    </td>
                    <td className={`${table.td} ${table.nowrap}`}>{ticket.reference}</td>
                    <td className={`${table.td} ${table.nowrap}`}>
                      {TICKET_KIND_LABEL[ticket.kind]}
                    </td>
                    <td className={`${table.td} ${table.name}`}>
                      {ticket.project?.name ?? <span className={table.muted}>General</span>}
                    </td>
                    <td className={table.td}>
                      <span className={`${forms.badge} ${STATUS_BADGE[ticket.status]}`}>
                        {CLIENT_TICKET_STATUS[ticket.status]}
                      </span>
                    </td>
                    <td className={`${table.td} ${table.nowrap}`}>
                      {formatShortDate(ticket.updatedAt)}
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
