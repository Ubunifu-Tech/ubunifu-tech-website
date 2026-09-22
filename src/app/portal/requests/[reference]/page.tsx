import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requireClient } from '@/lib/console/auth';
import { CLIENT_TICKET_STATUS, TICKET_KIND_LABEL } from '@/lib/console/tickets';
import { formatDate, formatRelative } from '@/lib/console/money';
import { ReplyForm } from '../RequestForms';
import styles from '../../Portal.module.css';
import forms from '@/styles/forms.module.css';

const STATUS_BADGE: Record<string, string> = {
  open: forms.badgeWarn,
  triaged: '',
  in_progress: forms.badgeLive,
  waiting_on_client: forms.badgeWarn,
  resolved: forms.badgeGood,
  closed: '',
};

export async function generateMetadata({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  return { title: decodeURIComponent(reference) };
}

export default async function PortalRequest({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const actor = await requireClient();
  const { reference } = await params;
  const now = new Date();

  const ticket = await db.ticket.findFirst({
    // Scoped in the query, so another client's reference does not match.
    where: { reference: decodeURIComponent(reference), clientId: actor.clientId },
    select: {
      id: true,
      reference: true,
      subject: true,
      kind: true,
      status: true,
      createdAt: true,
      resolvedAt: true,
      project: { select: { name: true, slug: true } },
      openedBy: { select: { name: true } },
      messages: {
        // Internal notes are excluded here, not filtered in the page — they
        // are never sent to the browser at all.
        where: { isInternal: false },
        orderBy: { createdAt: 'asc' },
        select: { id: true, actorType: true, body: true, createdAt: true },
      },
    },
  });

  if (!ticket) notFound();

  return (
    <main className={`${styles.page} ${styles.medium}`}>
      <div className={styles.pageHead}>
        <Link href="/portal/requests" className={styles.projectMeta}>
          ← Your requests
        </Link>
        <h1 className={styles.heading}>{ticket.subject}</h1>
        <p className={styles.lead}>
          {ticket.reference} · {TICKET_KIND_LABEL[ticket.kind]} · raised{' '}
          {formatDate(ticket.createdAt)}
          {ticket.project ? (
            <>
              {' '}
              ·{' '}
              <Link href={`/portal/projects/${ticket.project.slug}`}>{ticket.project.name}</Link>
            </>
          ) : null}
        </p>
        <p>
          <span className={`${forms.badge} ${STATUS_BADGE[ticket.status]}`}>
            {CLIENT_TICKET_STATUS[ticket.status]}
          </span>
        </p>
      </div>

      <section className={forms.card}>
        <div className={forms.cardHeader}>
          <h2 className={forms.cardTitle}>The conversation</h2>
          <span className={forms.cardMeta}>
            {ticket.messages.length} {ticket.messages.length === 1 ? 'message' : 'messages'}
          </span>
        </div>

        <ul className={styles.thread}>
          {ticket.messages.map((message) => {
            const fromUs = message.actorType === 'staff';
            return (
              <li
                key={message.id}
                className={`${styles.message} ${fromUs ? styles.fromUs : ''}`}
              >
                <p className={styles.messageWho}>
                  {fromUs ? 'Ubunifu' : (ticket.openedBy?.name ?? 'You')} ·{' '}
                  {formatRelative(message.createdAt, now)}
                </p>
                <p className={styles.messageBody}>{message.body}</p>
              </li>
            );
          })}
        </ul>

        <ReplyForm ticketId={ticket.id} closed={ticket.status === 'closed'} />
      </section>
    </main>
  );
}
