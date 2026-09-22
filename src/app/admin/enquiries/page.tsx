import Link from 'next/link';
import { db } from '@/lib/db';
import { EnquiryStatus, type Prisma } from '@/generated/prisma/client';
import { requireStaff } from '@/lib/console/auth';
import { formatRelative } from '@/lib/console/money';
import { TriageControls } from './TriageControls';
import styles from '../Admin.module.css';
import forms from '@/styles/forms.module.css';

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
 * Filters, as links rather than a control.
 *
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
  searchParams: Promise<{ show?: string }>;
}) {
  await requireStaff();
  const { show } = await searchParams;
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
      createdAt: true,
      client: { select: { id: true, name: true } },
    },
  });

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <h1 className={styles.heading}>
            What has <span className={styles.headingAccent}>come in</span>
          </h1>
          <p className={styles.lead}>
            Everything sent through the website form. Nothing here is deleted — an address that
            sends one real enquiry and one piece of spam is worth being able to look up.
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

      {enquiries.length === 0 ? (
        <p className={styles.empty}>
          {active === 'open'
            ? 'Nothing waiting. Everything that has come in has been picked up.'
            : 'Nothing here.'}
        </p>
      ) : (
        <div className={styles.stack}>
          {enquiries.map((enquiry) => (
            <article key={enquiry.id} className={styles.record}>
              <div className={styles.recordHead}>
                <h2 className={styles.recordName}>{enquiry.name}</h2>
                <span className={`${forms.badge} ${STATUS_BADGE[enquiry.status]}`}>
                  {STATUS_LABEL[enquiry.status]}
                </span>
              </div>
              <p className={styles.recordMeta}>
                <a href={`mailto:${enquiry.email}`}>{enquiry.email}</a> · {enquiry.subject} ·{' '}
                {formatRelative(enquiry.createdAt, now)}
                {enquiry.client && ` · now ${enquiry.client.name}`}
              </p>

              <p className={styles.quote}>{enquiry.message}</p>

              {enquiry.status === 'converted' ? (
                <div className={styles.recordActions}>
                  <p className={styles.note}>
                    Onboarded as {enquiry.client?.name ?? 'a client'}. Nothing left to do here.
                  </p>
                </div>
              ) : (
                <div className={styles.rows}>
                  <TriageControls
                    id={enquiry.id}
                    status={enquiry.status}
                    note={enquiry.internalNote}
                  />
                  <div className={styles.recordActions}>
                    <Link href={`/clients/new?enquiry=${enquiry.id}`} className={forms.button}>
                      Onboard as a client
                    </Link>
                    <p className={forms.payoff}>
                      Opens the new client form with their name, email and what they asked for
                      already filled in.
                    </p>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
