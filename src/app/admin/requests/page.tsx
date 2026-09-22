import Link from 'next/link';
import { db } from '@/lib/db';
import type { Prisma } from '@/generated/prisma/client';
import { requireStaff } from '@/lib/console/auth';
import {
  OPEN_TO_US,
  STAFF_TICKET_STATUS,
  TICKET_KIND_LABEL,
  TICKET_PRIORITY_LABEL,
} from '@/lib/console/tickets';
import { formatRelative, formatShortDate } from '@/lib/console/money';
import styles from '../Admin.module.css';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';

export const metadata = { title: 'Requests' };

const STATUS_BADGE: Record<string, string> = {
  open: forms.badgeWarn,
  triaged: '',
  in_progress: forms.badgeLive,
  waiting_on_client: '',
  resolved: forms.badgeGood,
  closed: '',
};

const PRIORITY_BADGE: Record<string, string> = {
  low: '',
  normal: '',
  high: forms.badgeWarn,
  urgent: forms.badgeBad,
};

const FILTERS = [
  { key: 'ours', label: 'On us' },
  { key: 'theirs', label: 'Waiting on them' },
  { key: 'done', label: 'Done' },
  { key: 'all', label: 'Everything' },
] as const;

function filterToWhere(key: string): Prisma.TicketWhereInput {
  switch (key) {
    case 'theirs':
      return { status: 'waiting_on_client' };
    case 'done':
      return { status: { in: ['resolved', 'closed'] } };
    case 'all':
      return {};
    default:
      return { status: { in: [...OPEN_TO_US] } };
  }
}

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string }>;
}) {
  await requireStaff();
  const { show } = await searchParams;
  const active = FILTERS.some((f) => f.key === show) ? show! : 'ours';
  const now = new Date();

  const tickets = await db.ticket.findMany({
    where: filterToWhere(active),
    // Oldest first: the one that has waited longest is the one that costs us.
    orderBy: [{ priority: 'desc' }, { updatedAt: 'asc' }],
    take: 200,
    select: {
      id: true,
      reference: true,
      subject: true,
      kind: true,
      status: true,
      priority: true,
      createdAt: true,
      updatedAt: true,
      client: { select: { name: true, slug: true } },
      project: { select: { name: true, slug: true } },
      openedBy: { select: { name: true } },
      messages: { select: { id: true } },
    },
  });

  const urgent = tickets.filter((ticket) => ticket.priority === 'urgent').length;
  const unread = tickets.filter((ticket) => ticket.status === 'open').length;

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <h1 className={styles.heading}>
            What clients have <span className={styles.headingAccent}>asked for</span>
          </h1>
          <p className={styles.lead}>
            Support, changes, content and questions raised from the portal. Priority is ours to
            set — the client never sees it, and nobody is asked to rank their own problem.
          </p>
        </div>
      </div>

      <div className={styles.stats}>
        <div className={`${styles.stat} ${unread > 0 ? styles.statAlert : ''}`}>
          <p className={styles.statLabel}>Unread</p>
          <p className={styles.statValue}>{unread}</p>
          <p className={styles.statHint}>Nobody has looked at these</p>
        </div>
        <div className={`${styles.stat} ${urgent > 0 ? styles.statAlert : ''}`}>
          <p className={styles.statLabel}>Urgent</p>
          <p className={styles.statValue}>{urgent}</p>
          <p className={styles.statHint}>As we ranked them</p>
        </div>
        <div className={styles.stat}>
          <p className={styles.statLabel}>On us</p>
          <p className={styles.statValue}>{tickets.length}</p>
          <p className={styles.statHint}>In this view</p>
        </div>
      </div>

      <div className={styles.filters}>
        {FILTERS.map((filter) => (
          <Link
            key={filter.key}
            href={filter.key === 'ours' ? '/requests' : `/requests?show=${filter.key}`}
            className={styles.filter}
            aria-current={filter.key === active}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      <div className={table.frame}>
        <div className={table.toolbar}>
          <div className={table.toolbarText}>
            <h2 className={table.title}>
              {FILTERS.find((f) => f.key === active)?.label ?? 'Requests'}
            </h2>
            <span className={table.count}>
              {tickets.length} {tickets.length === 1 ? 'request' : 'requests'}, longest wait first
            </span>
          </div>
        </div>
        <div className={table.scroll}>
          <table className={table.table}>
            <thead>
              <tr>
                <th className={table.th} scope="col">Request</th>
                <th className={table.th} scope="col">Client</th>
                <th className={table.th} scope="col">Kind</th>
                <th className={table.th} scope="col">Priority</th>
                <th className={table.th} scope="col">State</th>
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
                    <p className={table.emptyTitle}>
                      {active === 'ours' ? 'Nothing waiting on us.' : 'Nothing here.'}
                    </p>
                    <p className={table.emptyHint}>
                      {active === 'ours'
                        ? 'Every request has been picked up or handed back.'
                        : 'Try another view.'}
                    </p>
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr key={ticket.id} className={table.tr}>
                    <td className={`${table.td} ${table.primary}`}>
                      <Link href={`/requests/${ticket.reference}`} className={table.link}>
                        {ticket.subject}
                      </Link>
                      <span className={table.sub}>
                        {ticket.reference} · {ticket.openedBy?.name ?? 'unknown'} ·{' '}
                        {ticket.messages.length}{' '}
                        {ticket.messages.length === 1 ? 'message' : 'messages'}
                      </span>
                    </td>
                    <td className={`${table.td} ${table.name}`}>
                      <Link href={`/clients/${ticket.client.slug}`} className={table.link}>
                        {ticket.client.name}
                      </Link>
                      {ticket.project && (
                        <span className={table.sub}>{ticket.project.name}</span>
                      )}
                    </td>
                    <td className={`${table.td} ${table.nowrap}`}>
                      {TICKET_KIND_LABEL[ticket.kind]}
                    </td>
                    <td className={table.td}>
                      <span className={`${forms.badge} ${PRIORITY_BADGE[ticket.priority]}`}>
                        {TICKET_PRIORITY_LABEL[ticket.priority]}
                      </span>
                    </td>
                    <td className={table.td}>
                      <span className={`${forms.badge} ${STATUS_BADGE[ticket.status]}`}>
                        {STAFF_TICKET_STATUS[ticket.status]}
                      </span>
                    </td>
                    <td className={`${table.td} ${table.nowrap}`}>
                      {formatShortDate(ticket.updatedAt)}
                      <span className={table.sub}>{formatRelative(ticket.updatedAt, now)}</span>
                    </td>
                    <td className={`${table.td} ${table.actions}`}>
                      <span className={table.actionGroup}>
                        <Link href={`/requests/${ticket.reference}`} className={table.action}>
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
