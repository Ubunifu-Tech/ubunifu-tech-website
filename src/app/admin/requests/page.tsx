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
import { liveTicket } from '@/lib/console/live';
import { Figures } from '@/components/console/Figures';
import { ListFooter, ListToolbar, searchText } from '@/components/console/ListToolbar';
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
  searchParams: Promise<{ show?: string; q?: string }>;
}) {
  await requireStaff();
  const { show, q } = await searchParams;
  const active = FILTERS.some((f) => f.key === show) ? show! : 'ours';
  const query = searchText(q);
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);

  const matching: Prisma.TicketWhereInput = query
    ? {
        OR: [
          { reference: { contains: query, mode: 'insensitive' } },
          { subject: { contains: query, mode: 'insensitive' } },
          { client: { name: { contains: query, mode: 'insensitive' } } },
          { project: { name: { contains: query, mode: 'insensitive' } } },
        ],
      }
    : {};

  const [tickets, viewCounts, unread, urgent, oldest, resolvedThisWeek] = await Promise.all([
    db.ticket.findMany({
      where: { AND: [liveTicket, filterToWhere(active), matching] },
      // Oldest first by when it was raised: the one that has waited longest is
      // the one that costs us. Not by last activity, which every reply moves,
      // or a request the client has just chased would drop to the bottom.
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
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
      },
    }),
    Promise.all(
      FILTERS.map((filter) =>
        db.ticket.count({ where: { AND: [liveTicket, filterToWhere(filter.key), matching] } }),
      ),
    ),
    // The figures cover every request, whichever view is open below.
    db.ticket.count({ where: { ...liveTicket, status: 'open' } }),
    db.ticket.count({ where: { ...liveTicket, priority: 'urgent', status: { in: [...OPEN_TO_US] } } }),
    db.ticket.findFirst({
      where: { ...liveTicket, status: { in: [...OPEN_TO_US] } },
      orderBy: { createdAt: 'asc' },
      select: { reference: true, createdAt: true },
    }),
    db.ticket.count({ where: { ...liveTicket, resolvedAt: { gte: weekAgo } } }),
  ]);
  const total = viewCounts[FILTERS.findIndex((f) => f.key === active)] ?? 0;
  const oldestDays = oldest
    ? Math.floor((now.getTime() - oldest.createdAt.getTime()) / 86_400_000)
    : 0;

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <h1 className={styles.heading}>
            What clients have <span className={styles.headingAccent}>asked for</span>
          </h1>
          <p className={styles.lead}>
            Support, changes, content and questions from clients.
          </p>
        </div>
      </div>

      <Figures
        items={[
          {
            label: 'Unread',
            value: unread,
            note: unread === 0 ? 'Everything has been looked at' : 'Nobody has opened these yet',
            tone: unread > 0 ? 'warn' : undefined,
          },
          {
            label: 'Urgent',
            value: urgent,
            note: urgent === 0 ? 'None open' : 'Open and marked urgent',
            tone: urgent > 0 ? 'bad' : undefined,
          },
          {
            label: 'Longest wait',
            value: oldest ? (oldestDays === 0 ? 'Today' : `${oldestDays} ${oldestDays === 1 ? 'day' : 'days'}`) : 'None',
            note: oldest ? `${oldest.reference}, opened ${formatShortDate(oldest.createdAt)}` : 'Nothing waiting on us',
            tone: oldestDays >= 7 ? 'warn' : undefined,
            href: oldest ? `/requests/${oldest.reference}` : undefined,
          },
          {
            label: 'Resolved this week',
            value: resolvedThisWeek,
            note: 'In the last seven days',
          },
        ]}
      />

      <div className={table.frame}>
        <ListToolbar
          path="/requests"
          views={FILTERS.map((filter, index) => ({ ...filter, count: viewCounts[index] ?? 0 }))}
          current={active}
          defaultView="ours"
          query={query}
          searchLabel="Search requests"
        />
        <div className={table.scroll}>
          <table className={table.table}>
            <thead>
              <tr>
                <th className={table.th} scope="col">Request</th>
                <th className={table.th} scope="col">Number</th>
                <th className={table.th} scope="col">From</th>
                <th className={table.th} scope="col">Client</th>
                <th className={table.th} scope="col">Project</th>
                <th className={table.th} scope="col">Kind</th>
                <th className={table.th} scope="col">Priority</th>
                <th className={table.th} scope="col">State</th>
                <th className={table.th} scope="col">Last activity</th>
              </tr>
            </thead>
            <tbody>
              {tickets.length === 0 ? (
                <tr>
                  <td className={table.emptyCell} colSpan={9}>
                    <p className={table.emptyTitle}>
                      {query
                        ? `No requests match “${query}” here.`
                        : active === 'ours'
                          ? 'Nothing waiting on us.'
                          : 'Nothing here.'}
                    </p>
                    <p className={table.emptyHint}>
                      {query
                        ? 'Try another view, or search for something else.'
                        : active === 'ours'
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
                    </td>
                    <td className={`${table.td} ${table.nowrap}`}>{ticket.reference}</td>
                    <td className={`${table.td} ${table.nowrap}`}>
                      {ticket.openedBy?.name ?? <span className={table.muted}>Unknown</span>}
                    </td>
                    <td className={`${table.td} ${table.name}`}>
                      <Link href={`/clients/${ticket.client.slug}`} className={table.link}>
                        {ticket.client.name}
                      </Link>
                    </td>
                    <td className={table.td}>
                      {ticket.project?.name ?? <span className={table.muted}>None</span>}
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
                      {formatRelative(ticket.updatedAt, now)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <ListFooter shown={tickets.length} total={total} noun={['request', 'requests']} query={query} />
      </div>
    </main>
  );
}
