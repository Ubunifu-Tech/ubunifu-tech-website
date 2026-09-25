'use server';

import { NO_PERMISSION } from '@/lib/console/permissions';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { TicketPriority, TicketStatus } from '@/generated/prisma/client';
import { can, requireStaff, recordAudit } from '@/lib/console/auth';
import { consoleEnv } from '@/lib/console/env';
import { sendConsoleEmail } from '@/lib/console/mailer';
import { ticketReplyEmail } from '@/lib/emails';
import { CLIENT_TICKET_STATUS } from '@/lib/console/tickets';
import { formText } from '@/lib/console/form';
import { liveTicket } from '@/lib/console/live';

export type TicketState = { status: 'idle' | 'done' | 'error'; message?: string };

/**
 * Replies to a client, or leaves a note for ourselves.
 *
 * One form, one checkbox, because they are the same act from the staff
 * member's point of view and splitting them into two screens is how an
 * internal note ends up in a reply. The checkbox is unticked by default: the
 * safe mistake is telling the client something they already knew, not telling
 * them something they should never have seen.
 */
export async function replyToTicket(
  _previous: TicketState,
  formData: FormData,
): Promise<TicketState> {
  const staff = await requireStaff();
  if (!can(staff, 'requests')) return { status: 'error', message: NO_PERMISSION };

  const ticketId = String(formData.get('ticketId') ?? '');
  const body = formText(formData, 'body');
  const isInternal = formData.get('isInternal') === 'on';

  if (body.length < 2 || body.length > 8000) {
    return { status: 'error', message: 'Write something first.' };
  }

  const ticket = await db.ticket.findUnique({
    where: { id: ticketId, ...liveTicket },
    select: {
      id: true,
      reference: true,
      subject: true,
      status: true,
      clientId: true,
      openedBy: { select: { name: true, email: true, canSignIn: true, deletedAt: true } },
      client: { select: { name: true } },
    },
  });
  if (!ticket) return { status: 'error', message: 'That request no longer exists.' };

  // Replying moves it to waiting-on-them; an internal note changes nothing,
  // because writing to ourselves is not progress the client can see.
  const nextStatus: TicketStatus | undefined = isInternal
    ? undefined
    : ticket.status === 'open' || ticket.status === 'triaged'
      ? TicketStatus.in_progress
      : undefined;

  await db.$transaction(async (tx) => {
    await tx.ticketMessage.create({
      data: { ticketId: ticket.id, actorType: 'staff', actorId: staff.id, body, isInternal },
    });
    // A reply the client can see is activity on the request, so the lists'
    // "last activity" follows it. An internal note is not: bumping the time
    // would show the client that something happened they cannot read.
    if (!isInternal) {
      await tx.ticket.update({
        where: { id: ticket.id },
        data: { updatedAt: new Date(), ...(nextStatus ? { status: nextStatus } : {}) },
      });
    }
  });

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: isInternal ? 'ticket.note_added' : 'ticket.replied',
    entityType: 'Ticket',
    entityId: ticket.id,
    summary: `${ticket.reference}: ${ticket.subject}`,
  });

  revalidatePath(`/admin/requests/${ticket.reference}`);

  if (isInternal) return { status: 'done', message: 'Noted. The client cannot see this.' };

  // The reply goes to whoever at the client wrote last, which is not always
  // the person who raised it; the person who raised it when that is not known.
  const lastWord = await db.ticketMessage.findFirst({
    where: { ticketId: ticket.id, actorType: 'client_contact' },
    orderBy: { createdAt: 'desc' },
    select: { actorId: true },
  });
  const lastWriter = lastWord?.actorId
    ? await db.clientContact.findFirst({
        where: { id: lastWord.actorId, clientId: ticket.clientId, deletedAt: null, canSignIn: true },
        select: { name: true, email: true, canSignIn: true, deletedAt: true },
      })
    : null;
  const contact = lastWriter?.email ? lastWriter : ticket.openedBy;
  if (!contact || contact.deletedAt || !contact.canSignIn) {
    return {
      status: 'done',
      message: 'Replied. The person who raised this can no longer sign in, so no email was sent.',
    };
  }

  if (!contact.email) {
    return { status: 'done', message: 'Replied. They have no email address yet, so it waits in their portal.' };
  }

  const sent = await sendConsoleEmail({
    to: contact.email,
    subject: `[${ticket.reference}] ${ticket.subject}`,
    html: ticketReplyEmail({
      name: contact.name,
      reference: ticket.reference,
      subject: ticket.subject,
      body,
      status: CLIENT_TICKET_STATUS[nextStatus ?? ticket.status] ?? ticket.status,
      url: `${consoleEnv.publicOrigin}/portal/requests/${ticket.reference}`,
    }),
    template: 'ticket_reply_to_client',
    entityType: 'Ticket',
    entityId: ticket.id,
  });

  if (!sent.ok) {
    return {
      status: 'error',
      message: `It is in their portal and the attempt is logged, but the email did not go: ${sent.error}`,
    };
  }
  return { status: 'done', message: `Replied to ${contact.email}.` };
}

/** Triage: where it stands, and how much it matters. */
export async function triageTicket(
  _previous: TicketState,
  formData: FormData,
): Promise<TicketState> {
  const staff = await requireStaff();
  if (!can(staff, 'requests')) return { status: 'error', message: NO_PERMISSION };

  const ticketId = String(formData.get('ticketId') ?? '');
  const statusRaw = String(formData.get('ticketStatus') ?? '');
  const priorityRaw = String(formData.get('priority') ?? '');

  if (!Object.values(TicketStatus).includes(statusRaw as TicketStatus)) {
    return { status: 'error', message: 'That is not a state a request can be in.' };
  }
  if (!Object.values(TicketPriority).includes(priorityRaw as TicketPriority)) {
    return { status: 'error', message: 'Choose a priority.' };
  }

  const ticket = await db.ticket.findUnique({
    where: { id: ticketId, ...liveTicket },
    select: { id: true, reference: true, status: true, priority: true, resolvedAt: true },
  });
  if (!ticket) return { status: 'error', message: 'That request no longer exists.' };

  const status = statusRaw as TicketStatus;
  const priority = priorityRaw as TicketPriority;

  const changes: string[] = [];
  if (status !== ticket.status) changes.push(`${ticket.status} → ${status}`);
  if (priority !== ticket.priority) changes.push(`priority ${ticket.priority} → ${priority}`);
  if (changes.length === 0) return { status: 'done', message: 'Nothing changed.' };

  await db.ticket.update({
    where: { id: ticket.id },
    data: {
      status,
      priority,
      /**
       * Write-once, like launchedAt and closedAt. Reopening a request and
       * resolving it again must not move the day the client was first told it
       * was done — that date is what any promise about turnaround is measured
       * against, and it is never cleared.
       */
      ...((status === 'resolved' || status === 'closed') && !ticket.resolvedAt
        ? { resolvedAt: new Date() }
        : {}),
    },
  });

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'ticket.triaged',
    entityType: 'Ticket',
    entityId: ticket.id,
    summary: `${ticket.reference}: ${changes.join(', ')}`,
  });

  revalidatePath(`/admin/requests/${ticket.reference}`);
  revalidatePath('/admin/requests');
  return { status: 'done', message: 'Saved.' };
}
