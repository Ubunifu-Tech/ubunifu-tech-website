'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { TicketKind } from '@/generated/prisma/client';
import { createTicket } from '@/lib/console/ticket-create';
import { allow } from '@/lib/console/rate-limit';
import { TEAM_INBOX } from '@/lib/console/alerts';
import { requireClient, recordAudit } from '@/lib/console/auth';
import { consoleEnv } from '@/lib/console/env';
import { sendConsoleEmail } from '@/lib/console/mailer';
import { ticketRaisedEmail } from '@/lib/emails';
import { formText } from '@/lib/console/form';
import { liveTicket } from '@/lib/console/live';

export type RequestState = { status: 'idle' | 'done' | 'error'; message?: string };

/**
 * A client asking us for something.
 *
 * The request is written to the database before anyone is emailed, and the
 * client is told it worked on that basis — the same rule the website enquiry
 * form follows. A mail outage must never lose a request somebody took the
 * trouble to write.
 *
 * Priority is deliberately not on the form. Everything a client raises is
 * urgent to the client, and asking them to rank it either produces all-urgent
 * or makes them feel they are being sorted. Staff set it on triage, where the
 * comparison across clients can actually be made.
 */
export async function raiseRequest(
  _previous: RequestState,
  formData: FormData,
): Promise<RequestState> {
  const actor = await requireClient();

  const kindRaw = String(formData.get('kind') ?? '');
  const subject = String(formData.get('subject') ?? '').trim();
  const body = formText(formData, 'body');
  const projectId = String(formData.get('projectId') ?? '').trim();

  if (!Object.values(TicketKind).includes(kindRaw as TicketKind)) {
    return { status: 'error', message: 'Choose what kind of request this is.' };
  }
  if (subject.length < 4 || subject.length > 160) {
    return { status: 'error', message: 'Give it a short subject so we can find it again.' };
  }
  if (body.length < 10 || body.length > 8000) {
    return { status: 'error', message: 'Tell us a little more than that.' };
  }
  if (!(await allow('ticket-raise', actor.clientId, { limit: 20, windowMinutes: 24 * 60 }))) {
    return { status: 'error', message: 'That is a lot of requests for one day. Add to an open one instead.' };
  }

  // A project id from the form is checked against this client's own projects,
  // so a tampered value cannot attach a request to somebody else's work.
  let project: { id: string; name: string } | null = null;
  if (projectId) {
    project = await db.project.findFirst({
      where: { id: projectId, clientId: actor.clientId, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!project) {
      return { status: 'error', message: 'That project is not one of yours.' };
    }
  }

  const ticket = await createTicket({
    actor,
    kind: kindRaw as TicketKind,
    subject,
    body,
    project,
  });

  revalidatePath('/portal/requests');
  redirect(`/portal/requests/${ticket.reference}`);
}

/** A reply from the client on their own request. */
export async function replyToRequest(
  _previous: RequestState,
  formData: FormData,
): Promise<RequestState> {
  const actor = await requireClient();

  const ticketId = String(formData.get('ticketId') ?? '');
  const body = formText(formData, 'body');

  if (body.length < 2 || body.length > 8000) {
    return { status: 'error', message: 'Write a reply first.' };
  }

  const ticket = await db.ticket.findFirst({
    where: { id: ticketId, clientId: actor.clientId, ...liveTicket },
    select: { id: true, reference: true, subject: true, status: true },
  });
  if (!ticket) return { status: 'error', message: 'That request is not one of yours.' };
  if (ticket.status === 'closed') {
    return {
      status: 'error',
      message: 'This one is closed. Raise a new request and we will pick it up.',
    };
  }

  // A reply back on a request marked done means it is not done, so it goes
  // back into the team's queue. resolvedAt is left alone: it records the first
  // time it was resolved, which is what response figures are measured on.
  const reopened = ticket.status === 'resolved';
  await db.$transaction(async (tx) => {
    await tx.ticketMessage.create({
      data: { ticketId: ticket.id, actorType: 'client_contact', actorId: actor.id, body },
    });
    // Every reply is activity, so "last activity" and the order of the lists
    // follow the conversation rather than the last change of status. A reply
    // also means the client is no longer the one holding things up.
    await tx.ticket.update({
      where: { id: ticket.id },
      data: {
        updatedAt: new Date(),
        ...(ticket.status === 'waiting_on_client' || reopened ? { status: 'in_progress' as const } : {}),
      },
    });
  });

  await recordAudit({
    actorType: 'client_contact',
    actorId: actor.id,
    action: 'ticket.client_replied',
    entityType: 'Ticket',
    entityId: ticket.id,
    summary: `${ticket.reference}: ${ticket.subject}`,
  });

  await sendConsoleEmail({
    to: TEAM_INBOX,
    subject: `[${ticket.reference}] ${actor.clientName} replied`,
    html: ticketRaisedEmail({
      reference: ticket.reference,
      clientName: actor.clientName,
      from: actor.name,
      fromEmail: actor.email,
      kind: 'reply',
      subject: ticket.subject,
      body,
      projectName: null,
      url: `${consoleEnv.adminOrigin}/requests/${ticket.reference}`,
    }),
    template: 'ticket_reply',
    entityType: 'Ticket',
    entityId: ticket.id,
  });

  revalidatePath(`/portal/requests/${ticket.reference}`);
  revalidatePath('/portal/requests');
  return { status: 'done', message: reopened ? 'Sent. The request is open again.' : 'Sent.' };
}
