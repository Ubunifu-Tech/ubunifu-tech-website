import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { can, requireStaff } from '@/lib/console/auth';
import { activityFor } from '@/lib/console/activity';
import {
  CLIENT_TICKET_STATUS,
  STAFF_TICKET_STATUS,
  TICKET_KIND_LABEL,
  TICKET_PRIORITY_LABEL,
} from '@/lib/console/tickets';
import { formatDate, formatRelative, formatShortDate } from '@/lib/console/money';
import { ActivityFeed } from '@/components/console/ActivityFeed';
import { Callout } from '@/components/console/Callout';
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

  // A removed client's requests stay readable, like the rest of their record.
  const ticket = await db.ticket.findUnique({
    where: { reference: decodeURIComponent(reference) },
    select: {
      id: true,
      reference: true,
      subject: true,
      kind: true,
      status: true,
      priority: true,
      createdAt: true,
      resolvedAt: true,
      clientId: true,
      client: { select: { name: true, slug: true, deletedAt: true } },
      project: { select: { name: true, slug: true, reference: true, deletedAt: true } },
      openedBy: { select: { name: true, email: true } },
      messages: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          actorType: true,
          actorId: true,
          body: true,
          isInternal: true,
          createdAt: true,
        },
      },
    },
  });

  if (!ticket) notFound();

  const clientGone = ticket.client.deletedAt;
  const removedAt = clientGone ?? ticket.project?.deletedAt ?? null;
  const mayChange = mayReply && !removedAt;
  const clientHref = clientGone ? `/removed/${ticket.client.slug}` : `/clients/${ticket.client.slug}`;

  // Each message under the name of whoever wrote it: several people at a
  // client can reply on one request, and so can several of us.
  const ids = (type: string) => [
    ...new Set(ticket.messages.flatMap((m) => (m.actorType === type && m.actorId ? [m.actorId] : []))),
  ];
  const [theirPeople, ourPeople] = await Promise.all([
    db.clientContact.findMany({
      where: { id: { in: ids('client_contact') }, clientId: ticket.clientId },
      select: { id: true, name: true },
    }),
    db.staffUser.findMany({ where: { id: { in: ids('staff') } }, select: { id: true, name: true } }),
  ]);
  const names = new Map([...theirPeople, ...ourPeople].map((person) => [person.id, person.name]));
  const writer = (message: { actorType: string; actorId: string | null }) =>
    (message.actorId && names.get(message.actorId)) ??
    (message.actorType === 'staff' ? 'Us' : (ticket.openedBy?.name ?? 'The client'));

  const activity = await activityFor([ticket.id]);

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <Link href={clientGone ? clientHref : '/requests'} className={styles.backLink}>
            ← {clientGone ? ticket.client.name : 'Requests'}
          </Link>
          <h1 className={styles.heading}>{ticket.subject}</h1>
          <p className={styles.facts}>
            <span>
              <span className={styles.factLabel}>Reference</span> {ticket.reference}
            </span>
            <span>
              <span className={styles.factLabel}>From</span>{' '}
              <Link href={clientHref}>{ticket.client.name}</Link>
              {ticket.openedBy ? ` · ${ticket.openedBy.name}` : ''}
            </span>
            {ticket.project && (
              <span>
                <span className={styles.factLabel}>Project</span>{' '}
                {ticket.project.deletedAt ? (
                  ticket.project.reference
                ) : (
                  <Link href={`/projects/${ticket.project.slug}`}>{ticket.project.reference}</Link>
                )}
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

      {removedAt && (
        <Callout kind="info">
          {clientGone ? ticket.client.name : ticket.project?.name} was removed on{' '}
          {formatShortDate(removedAt)}. This request is kept for the record and cannot be changed.
        </Callout>
      )}

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
                      ? `Internal note from ${writer(message)}. The client cannot see this.`
                      : writer(message)}{' '}
                    · {formatRelative(message.createdAt, now)}
                  </p>
                  <p className={styles.messageBody}>{message.body}</p>
                </li>
              );
            })}
          </ul>

          {mayChange && <ReplyBox ticketId={ticket.id} />}
        </section>

        <div className={styles.stack}>
          <section className={forms.card}>
            <div className={forms.cardHeader}>
              <h2 className={forms.cardTitle}>Triage</h2>
              <span className={forms.cardMeta}>
                They see &ldquo;{CLIENT_TICKET_STATUS[ticket.status]}&rdquo;
              </span>
            </div>
            {mayChange && (
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
