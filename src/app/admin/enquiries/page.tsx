import Link from 'next/link';
import { db } from '@/lib/db';
import { EnquiryStatus, type Prisma } from '@/generated/prisma/client';
import { requirePermission } from '@/lib/console/auth';
import { formatRelative, formatShortDate } from '@/lib/console/money';
import { TriageControls } from './TriageControls';
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
  searchParams: Promise<{ show?: string; open?: string }>;
}) {
  await requirePermission('enquiries');
  const { show, open } = await searchParams;
  const active = FILTERS.some((f) => f.key === show) ? show! : 'open';
  const now = new Date();

  const enquiries = await db.enquiry.findMany({
    where: filterToWhere(active),
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
      client: { select: { name: true, slug: true } },
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

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <h1 className={styles.heading}>
            What has <span className={styles.headingAccent}>come in</span>
          </h1>
          <p className={styles.lead}>
            Everything sent through the website form, recorded before anyone is emailed — so an
            outage never loses a lead. Nothing here is deleted.
          </p>
        </div>
      </div>

      <div className={styles.filters}>
        {FILTERS.map((filter) => (
          <Link
            key={filter.key}
            href={filter.key === 'open' ? '/enquiries' : `/enquiries?show=${filter.key}`}
            className={styles.filter}
            aria-current={filter.key === active}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      <div className={styles.stack}>
        <div className={table.frame}>
          <div className={table.toolbar}>
            <div className={table.toolbarText}>
              <h2 className={table.title}>
                {FILTERS.find((f) => f.key === active)?.label ?? 'Enquiries'}
              </h2>
              <span className={table.count}>
                {enquiries.length} {enquiries.length === 1 ? 'enquiry' : 'enquiries'}
              </span>
            </div>
          </div>

          <div className={table.scroll}>
            <table className={table.table}>
              <thead>
                <tr>
                  <th className={table.th} scope="col">From</th>
                  <th className={table.th} scope="col">About</th>
                  <th className={table.th} scope="col">Message</th>
                  <th className={table.th} scope="col">Stage</th>
                  <th className={table.th} scope="col">Received</th>
                  <th className={`${table.th} ${table.actionsHead}`} scope="col">
                    <span className={table.muted}>Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {enquiries.length === 0 ? (
                  <tr>
                    <td className={table.emptyCell} colSpan={6}>
                      <p className={table.emptyTitle}>
                        {active === 'open' ? 'Nothing waiting.' : 'Nothing here.'}
                      </p>
                      <p className={table.emptyHint}>
                        {active === 'open'
                          ? 'Everything that has come in has been picked up.'
                          : 'Try another view.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  enquiries.map((enquiry) => (
                    <tr key={enquiry.id} className={table.tr}>
                      <td className={`${table.td} ${table.primary}`}>
                        {enquiry.name}
                        <span className={table.sub}>
                          <a href={`mailto:${enquiry.email}`}>{enquiry.email}</a>
                        </span>
                      </td>
                      <td className={`${table.td} ${table.nowrap}`}>
                        {enquiry.subject}
                        {enquiry.source === 'website_assistant' && (
                          <span className={table.sub}>via the assistant</span>
                        )}
                      </td>
                      <td className={table.td}>
                        <span className={table.clamp}>{enquiry.message}</span>
                      </td>
                      <td className={table.td}>
                        <span className={`${forms.badge} ${STATUS_BADGE[enquiry.status]}`}>
                          {STATUS_LABEL[enquiry.status]}
                        </span>
                        {enquiry.client && (
                          <span className={table.sub}>
                            <Link href={`/clients/${enquiry.client.slug}`}>
                              {enquiry.client.name}
                            </Link>
                          </span>
                        )}
                      </td>
                      <td className={`${table.td} ${table.nowrap}`}>
                        {formatShortDate(enquiry.createdAt)}
                        <span className={table.sub}>
                          {formatRelative(enquiry.createdAt, now)}
                        </span>
                      </td>
                      <td className={`${table.td} ${table.actions}`}>
                        <span className={table.actionGroup}>
                          {enquiry.status === 'converted' ? (
                            <span className={table.muted}>Onboarded</span>
                          ) : (
                            <>
                              <Link
                                href={
                                  expanded?.id === enquiry.id
                                    ? `/enquiries?show=${active}`
                                    : `/enquiries?show=${active}&open=${enquiry.id}`
                                }
                                className={table.action}
                                scroll={false}
                              >
                                {expanded?.id === enquiry.id ? 'Close' : 'Triage'}
                              </Link>
                              <Link
                                href={`/clients/new?enquiry=${enquiry.id}`}
                                className={table.action}
                              >
                                Onboard
                              </Link>
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
                  <span className={forms.cardMeta}>
                    The assistant summarised this above; here it is in full
                  </span>
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
              <TriageControls
                id={expanded.id}
                status={expanded.status}
                note={expanded.internalNote}
              />
            </div>
            <div className={forms.actions}>
              <Link href={`/clients/new?enquiry=${expanded.id}`} className={forms.button}>
                Onboard as a client
              </Link>
              <p className={forms.payoff}>
                Opens the new client form with their name, email and what they asked for already
                filled in.
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
