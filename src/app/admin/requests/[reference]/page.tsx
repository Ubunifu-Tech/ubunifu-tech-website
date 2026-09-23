import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { can, requireStaff } from '@/lib/console/auth';
import { activityFor } from '@/lib/console/activity';
import { liveTicket } from '@/lib/console/live';
import {
  CLIENT_TICKET_STATUS,
  STAFF_TICKET_STATUS,
  TICKET_KIND_LABEL,
  TICKET_PRIORITY_LABEL,
} from '@/lib/console/tickets';
import { formatDate, formatRelative } from '@/lib/console/money';
import { ActivityFeed } from '@/components/console/ActivityFeed';
import { ReplyBox, TriageBox } from '../TicketControls';
import styles from '../../Admin.module.css';
import forms from '@/styles/forms.module.css';

const STATUS_BADGE: Record<string, string> = {
  open: forms.badgeWarn,
  triaged: '',
  in_progress: forms.badgeLive,
  waiting_on_client: '',
  resolved: forms.badgeGood,
  closed: '',
};

export async function generateMetadata({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  return { title: decodeURIComponent(reference) };
}

export default async function TicketPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const staff = await requireStaff();
  const mayReply = can(staff, 'requests');
  const { reference } = await params;
  const now = new Date();

  const ticket = await db.ticket.findUnique({
    where: { reference: decodeURIComponent(reference), ...liveTicket },
    select: {
      id: true,
      reference: true,
      subject: true,
      kind: true,
      status: true,
      priority: true,
      createdAt: true,
      resolvedAt: true,
      client: { select: { name: true, slug: true } },
      project: { select: { name: true, slug: true, reference: true } },
      openedBy: { select: { name: true, email: true } },
      messages: {
        orderBy: { createdAt: 'asc' },
        select: { id: true, actorType: true, body: true, isInternal: true, createdAt: true },
      },
    },
  });

  if (!ticket) notFound();

  const activity = await activityFor([ticket.id]);

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <Link href="/requests" className={styles.backLink}>
            ← Requests
          </Link>
          <h1 className={styles.heading}>{ticket.subject}</h1>
          <p className={styles.facts}>
            <span>
              <span className={styles.factLabel}>Reference</span> {ticket.reference}
            </span>
            <span>
              <span className={styles.factLabel}>From</span>{' '}
              <Link href={`/clients/${ticket.client.slug}`}>{ticket.client.name}</Link>
              {ticket.openedBy ? ` · ${ticket.openedBy.name}` : ''}
            </span>
            {ticket.project && (
              <span>
                <span className={styles.factLabel}>Project</span>{' '}
                <Link href={`/projects/${ticket.project.slug}`}>{ticket.project.reference}</Link>
              </span>
            )}
            <span>
              <span className={styles.factLabel}>Kind</span> {TICKET_KIND_LABEL[ticket.kind]}
            </span>
            <span>
              <span className={styles.factLabel}>Raised</span> {formatDate(ticket.createdAt)}
            </span>
          </p>
        </div>
        <span className={`${forms.badge} ${STATUS_BADGE[ticket.status]}`}>
          {STAFF_TICKET_STATUS[ticket.status]}
        </span>
      </div>

      <div className={styles.columns}>
        <section className={forms.card}>
          <div className={forms.cardHeader}>
            <h2 className={forms.cardTitle}>The conversation</h2>
            <span className={forms.cardMeta}>
              Tinted messages are ours. Notes to ourselves are marked and never leave here.
            </span>
          </div>

          <ul className={styles.thread}>
            {ticket.messages.map((message) => {
              const fromUs = message.actorType === 'staff';
              return (
                <li
                  key={message.id}
                  className={`${styles.message} ${
                    message.isInternal ? styles.internal : fromUs ? styles.fromUs : ''
                  }`}
                >
                  <p className={styles.messageWho}>
                    {message.isInternal
                      ? 'Internal note. The client cannot see this.'
                      : fromUs
                        ? 'Us'
                        : (ticket.openedBy?.name ?? 'The client')}{' '}
                    · {formatRelative(message.createdAt, now)}
                  </p>
                  <p className={styles.messageBody}>{message.body}</p>
                </li>
              );
            })}
          </ul>

          {mayReply && <ReplyBox ticketId={ticket.id} />}
        </section>

        <div className={styles.stack}>
          <section className={forms.card}>
            <div className={forms.cardHeader}>
              <h2 className={forms.cardTitle}>Triage</h2>
              <span className={forms.cardMeta}>
                They see &ldquo;{CLIENT_TICKET_STATUS[ticket.status]}&rdquo;
              </span>
            </div>
            {mayReply && (
              <TriageBox ticketId={ticket.id} status={ticket.status} priority={ticket.priority} />
            )}
            {ticket.resolvedAt && (
              <p className={styles.note}>
                First marked done on {formatDate(ticket.resolvedAt)}. That date never moves, even
                if this is reopened.
              </p>
            )}
            <p className={styles.note}>
              Priority now: {TICKET_PRIORITY_LABEL[ticket.priority]}.
            </p>
          </section>

          <section className={forms.card}>
            <div className={forms.cardHeader}>
              <h2 className={forms.cardTitle}>What has happened</h2>
            </div>
            <ActivityFeed items={activity} now={now} />
          </section>
        </div>
      </div>
    </main>
  );
}
