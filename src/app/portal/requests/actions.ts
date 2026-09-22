'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { TicketKind, type Prisma } from '@/generated/prisma/client';
import { requireClient, recordAudit } from '@/lib/console/auth';
import { consoleEnv } from '@/lib/console/env';
import { sendConsoleEmail } from '@/lib/console/mailer';
import { ticketRaisedEmail } from '@/lib/emails';
import { formText } from '@/lib/console/form';

export type RequestState = { status: 'idle' | 'done' | 'error'; message?: string };

/** TCK-2026-014, on the same rule as every other reference here. */
async function nextTicketReference(
  tx: Prisma.TransactionClient,
  now = new Date(),
): Promise<string> {
  const prefix = `TCK-${now.getFullYear()}-`;
  const latest = await tx.ticket.findFirst({
    where: { reference: { startsWith: prefix } },
    orderBy: { reference: 'desc' },
    select: { reference: true },
  });
  const previous = latest ? Number.parseInt(latest.reference.slice(prefix.length), 10) : 0;
  const next = Number.isFinite(previous) ? previous + 1 : 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

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

  const ticket = await db.$transaction(async (tx) => {
    const reference = await nextTicketReference(tx);
    return tx.ticket.create({
      data: {
        reference,
        clientId: actor.clientId,
        projectId: project?.id ?? null,
        openedById: actor.id,
        kind: kindRaw as TicketKind,
        subject,
        messages: {
          create: {
            actorType: 'client_contact',
            actorId: actor.id,
            body,
          },
        },
      },
      select: { id: true, reference: true },
    });
  });

  await recordAudit({
    actorType: 'client_contact',
    actorId: actor.id,
    action: 'ticket.raised',
    entityType: 'Ticket',
    entityId: ticket.id,
    summary: `${ticket.reference} — ${subject}`,
  });

  // Our own alert. The request is already safe; this failing is our problem.
  await sendConsoleEmail({
    to: 'info@ubunifutech.com',
    subject: `[${ticket.reference}] ${subject}`,
    html: ticketRaisedEmail({
      reference: ticket.reference,
      clientName: actor.clientName,
      from: actor.name,
      fromEmail: actor.email,
      kind: kindRaw,
      subject,
      body,
      projectName: project?.name ?? null,
      url: `${consoleEnv.adminOrigin}/requests/${ticket.reference}`,
    }),
    template: 'ticket_raised',
    entityType: 'Ticket',
    entityId: ticket.id,
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
    where: { id: ticketId, clientId: actor.clientId },
    select: { id: true, reference: true, subject: true, status: true },
  });
  if (!ticket) return { status: 'error', message: 'That request is not one of yours.' };
  if (ticket.status === 'closed') {
    return {
      status: 'error',
      message: 'This one is closed. Raise a new request and we will pick it up.',
    };
  }

  await db.$transaction(async (tx) => {
    await tx.ticketMessage.create({
      data: { ticketId: ticket.id, actorType: 'client_contact', actorId: actor.id, body },
    });
    // A client replying is the client no longer being the blocker.
    if (ticket.status === 'waiting_on_client') {
      await tx.ticket.update({ where: { id: ticket.id }, data: { status: 'in_progress' } });
    }
  });

  await recordAudit({
    actorType: 'client_contact',
    actorId: actor.id,
    action: 'ticket.client_replied',
    entityType: 'Ticket',
    entityId: ticket.id,
    summary: `${ticket.reference} — ${ticket.subject}`,
  });

  await sendConsoleEmail({
    to: 'info@ubunifutech.com',
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
  return { status: 'done', message: 'Sent.' };
}
