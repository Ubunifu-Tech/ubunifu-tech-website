import Link from 'next/link';
import { db } from '@/lib/db';
import { EnquiryStatus, type Prisma } from '@/generated/prisma/client';
import { requirePermission } from '@/lib/console/auth';
import { formatRelative, formatShortDate } from '@/lib/console/money';
import { liveEnquiry } from '@/lib/console/live';
import { TriageControls } from './TriageControls';
import { MenuLink, MenuList, RowMenu } from '@/components/console/RowMenu';
import { ListFooter, ListToolbar, searchText } from '@/components/console/ListToolbar';
import styles from '../Admin.module.css';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';

export const metadata = { title: 'Enquiries' };

const STATUS_LABEL: Record<EnquiryStatus, string> = {
  new: 'Unread',
  triaged: 'Read',
  in_conversation: 'Talking',
  qualified: 'Worth a proposal',
  converted: 'Became a client',
  declined: 'Not for us',
  spam: 'Spam',
};

const STATUS_BADGE: Record<EnquiryStatus, string> = {
  new: forms.badgeWarn,
  triaged: '',
  in_conversation: forms.badgeLive,
  qualified: forms.badgeLive,
  converted: forms.badgeGood,
  declined: '',
  spam: forms.badgeBad,
};

/**
 * "Open" is the default because it answers the only question anyone opens this
 * screen with: what has come in that nobody has dealt with. Spam and declined
 * are kept rather than deleted — an address that sent one real enquiry and one
 * piece of spam is worth being able to look up.
 */
const FILTERS = [
  { key: 'open', label: 'Open' },
  { key: 'new', label: 'Unread' },
  { key: 'qualified', label: 'Worth a proposal' },
  { key: 'converted', label: 'Became clients' },
  { key: 'closed', label: 'Declined & spam' },
  { key: 'all', label: 'Everything' },
] as const;

function filterToWhere(key: string): Prisma.EnquiryWhereInput {
  switch (key) {
    case 'new':
      return { status: 'new' };
    case 'qualified':
      return { status: 'qualified' };
    case 'converted':
      return { status: 'converted' };
    case 'closed':
      return { status: { in: ['declined', 'spam'] } };
    case 'all':
      return {};
    default:
      return { status: { in: ['new', 'triaged', 'in_conversation', 'qualified'] } };
  }
}

export default async function EnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string; open?: string; q?: string }>;
}) {
  await requirePermission('enquiries');
  const { show, open, q } = await searchParams;
  const active = FILTERS.some((f) => f.key === show) ? show! : 'open';
  const query = searchText(q);
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 86_400_000);

  const matching: Prisma.EnquiryWhereInput = query
    ? {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { subject: { contains: query, mode: 'insensitive' } },
          { message: { contains: query, mode: 'insensitive' } },
        ],
      }
    : {};

  const [viewCounts, thisWeek, weekBefore] = await Promise.all([
    Promise.all(
      FILTERS.map((filter) =>
        db.enquiry.count({ where: { AND: [liveEnquiry, filterToWhere(filter.key), matching] } }),
      ),
    ),
    db.enquiry.count({
      where: { ...liveEnquiry, createdAt: { gte: weekAgo }, status: { not: 'spam' } },
    }),
    db.enquiry.count({
      where: {
        ...liveEnquiry,
        createdAt: { gte: twoWeeksAgo, lt: weekAgo },
        status: { not: 'spam' },
      },
    }),
  ]);
  const total = viewCounts[FILTERS.findIndex((f) => f.key === active)] ?? 0;
  const keepQuery = query ? `&q=${encodeURIComponent(query)}` : '';

  const enquiries = await db.enquiry.findMany({
    where: { AND: [liveEnquiry, filterToWhere(active), matching] },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      name: true,
      email: true,
      subject: true,
      message: true,
      status: true,
      serviceLine: true,
      internalNote: true,
      source: true,
      createdAt: true,
      // Kept even when since removed: the enquiry still became them, but a
      // link to a page that is gone would lead nowhere.
      client: { select: { name: true, slug: true, deletedAt: true } },
      project: { select: { name: true, slug: true, deletedAt: true } },
      conversations: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true,
          messages: {
            where: { role: { in: ['user', 'assistant'] } },
            orderBy: { createdAt: 'asc' },
            select: { id: true, role: true, content: true },
          },
        },
      },
    },
  });

  /** One row is expanded at a time, chosen by ?open=. */
  const expanded = enquiries.find((enquiry) => enquiry.id === open);

  // Somebody who is already a client, writing in about something new.
  const returning =
    expanded && expanded.status !== 'converted'
      ? await db.clientContact.findFirst({
          where: { email: expanded.email, deletedAt: null, client: { deletedAt: null } },
          select: { client: { select: { name: true, slug: true } } },
        })
      : null;

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <h1 className={styles.heading}>
            What has <span className={styles.headingAccent}>come in</span>
          </h1>
          <p className={styles.lead}>
            Messages from the website form and the chat. {thisWeek} this week, {weekBefore} the week
            before.
          </p>
        </div>
      </div>

      <div className={styles.stack}>
        <div className={table.frame}>
          <ListToolbar
            path="/enquiries"
            views={FILTERS.map((filter, index) => ({ ...filter, count: viewCounts[index] ?? 0 }))}
            current={active}
            defaultView="open"
            query={query}
            searchLabel="Search enquiries"
          />

          <div className={table.scroll}>
            <table className={table.table}>
              <thead>
                <tr>
                  <th className={table.th} scope="col">
                    From
                  </th>
                  <th className={table.th} scope="col">
                    Email
                  </th>
                  <th className={table.th} scope="col">
                    About
                  </th>
                  <th className={table.th} scope="col">
                    Message
                  </th>
                  <th className={table.th} scope="col">
                    Stage
                  </th>
                  <th className={table.th} scope="col">
                    Client
                  </th>
                  <th className={table.th} scope="col">
                    Received
                  </th>
                  <th className={`${table.th} ${table.actionsHead}`} scope="col">
                    <span className={table.muted}>Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {enquiries.length === 0 ? (
                  <tr>
                    <td className={table.emptyCell} colSpan={8}>
                      <p className={table.emptyTitle}>
                        {query
                          ? `No enquiries match “${query}” here.`
                          : active === 'open'
                            ? 'Nothing waiting.'
                            : 'Nothing here.'}
                      </p>
                      <p className={table.emptyHint}>
                        {query
                          ? 'Try another view, or search for something else.'
                          : active === 'open'
                            ? 'Everything that has come in has been picked up.'
                            : 'Try another view.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  enquiries.map((enquiry) => (
                    <tr key={enquiry.id} className={table.tr}>
                      <td className={`${table.td} ${table.primary}`}>{enquiry.name}</td>
                      <td className={table.td}>
                        <a href={`mailto:${enquiry.email}`} className={table.link}>
                          {enquiry.email}
                        </a>
                      </td>
                      <td
                        className={`${table.td} ${table.name}`}
                        title={
                          enquiry.source === 'website_assistant'
                            ? 'Came in through the website assistant'
                            : undefined
                        }
                      >
                        <span className={table.clamp}>{enquiry.subject}</span>
                      </td>
                      <td className={table.td}>
                        <span className={table.clamp}>{enquiry.message}</span>
                      </td>
                      <td className={table.td}>
                        <span className={`${forms.badge} ${STATUS_BADGE[enquiry.status]}`}>
                          {STATUS_LABEL[enquiry.status]}
                        </span>
                      </td>
                      <td className={table.td}>
                        {!enquiry.client ? (
                          <span className={table.muted}>None</span>
                        ) : enquiry.client.deletedAt ? (
                          <Link href={`/removed/${enquiry.client.slug}`} className={table.link}>
                            {enquiry.client.name}
                          </Link>
                        ) : (
                          <Link href={`/clients/${enquiry.client.slug}`} className={table.link}>
                            {enquiry.client.name}
                          </Link>
                        )}
                      </td>
                      <td className={`${table.td} ${table.nowrap}`}>
                        {formatShortDate(enquiry.createdAt)}
                      </td>
                      <td className={`${table.td} ${table.actions}`}>
                        {enquiry.status === 'converted' ? (
                          <span className={table.muted}>Onboarded</span>
                        ) : (
                          <RowMenu label={`Actions for ${enquiry.name}`}>
                            <MenuList>
                              <MenuLink
                                href={
                                  expanded?.id === enquiry.id
                                    ? `/enquiries?show=${active}${keepQuery}`
                                    : `/enquiries?show=${active}&open=${enquiry.id}${keepQuery}`
                                }
                                scroll={false}
                              >
                                {expanded?.id === enquiry.id ? 'Close triage' : 'Triage'}
                              </MenuLink>
                              <MenuLink href={`/clients/new?enquiry=${enquiry.id}`}>
                                Onboard as a client
                              </MenuLink>
                            </MenuList>
                          </RowMenu>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <ListFooter
            shown={enquiries.length}
            total={total}
            noun={['enquiry', 'enquiries']}
            query={query}
          />
        </div>

        {/* Triage opens beneath the table rather than inside a row: a note box
            and a status control crammed into a cell make every other row taller
            for no reason. */}
        {expanded && (
          <section className={forms.card}>
            <div className={forms.cardHeader}>
              <h2 className={forms.cardTitle}>{expanded.name}</h2>
              <span className={forms.cardMeta}>
                {expanded.subject} · {formatRelative(expanded.createdAt, now)}
              </span>
            </div>
            <p className={styles.quote}>{expanded.message}</p>

            {expanded.conversations[0]?.messages.length ? (
              <>
                <div className={`${forms.cardHeader} ${styles.spaced}`}>
                  <h3 className={forms.cardTitle}>What they said in the chat</h3>
                  <span className={forms.cardMeta}>The whole conversation</span>
                </div>
                <ul className={styles.thread}>
                  {expanded.conversations[0].messages
                    .filter((message) => message.content.trim().length > 0)
                    .map((message) => (
                      <li
                        key={message.id}
                        className={`${styles.message} ${
                          message.role === 'assistant' ? styles.fromUs : ''
                        }`}
                      >
                        <p className={styles.messageWho}>
                          {message.role === 'assistant' ? 'Assistant' : expanded.name}
                        </p>
                        <p className={styles.messageBody}>{message.content}</p>
                      </li>
                    ))}
                </ul>
              </>
            ) : null}

            <div className={styles.rows}>
              {/* Keyed by enquiry: moving between ?open= keeps this page mounted, so
                  without a key a half-done Remove on one enquiry would carry to the next. */}
              <TriageControls
                key={expanded.id}
                id={expanded.id}
                status={expanded.status}
                note={expanded.internalNote}
              />
            </div>
            {expanded.status === 'converted' ? (
              <p className={styles.note}>
                Became{' '}
                {expanded.client && !expanded.client.deletedAt ? (
                  <Link href={`/clients/${expanded.client.slug}`} className={styles.inlineLink}>
                    {expanded.client.name}
                  </Link>
                ) : expanded.client ? (
                  `${expanded.client.name}, since removed`
                ) : (
                  'a client'
                )}
                {expanded.project && !expanded.project.deletedAt && (
                  <>
                    {', '}
                    <Link href={`/projects/${expanded.project.slug}`} className={styles.inlineLink}>
                      {expanded.project.name}
                    </Link>
                  </>
                )}
                .
              </p>
            ) : returning ? (
              <div className={forms.actions}>
                <Link
                  href={`/projects/new?client=${returning.client.slug}&enquiry=${expanded.id}`}
                  className={forms.button}
                >
                  Start a project for {returning.client.name}
                </Link>
                <Link
                  href={`/clients/new?enquiry=${expanded.id}`}
                  className={`${forms.button} ${forms.quiet}`}
                >
                  Add as a new client instead
                </Link>
                <p className={forms.payoff}>{expanded.email} is already one of their contacts.</p>
              </div>
            ) : (
              <div className={forms.actions}>
                <Link href={`/clients/new?enquiry=${expanded.id}`} className={forms.button}>
                  Make them a client
                </Link>
                <p className={forms.payoff}>
                  Their name, email and message are filled in. You can start the project in the same
                  step.
                </p>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
