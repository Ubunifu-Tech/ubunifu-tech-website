import 'server-only';
import { db } from '@/lib/db';
import type { Prisma, TicketKind } from '@/generated/prisma/client';
import { recordAudit, type ClientActor } from './auth';
import { consoleEnv } from './env';
import { sendConsoleEmail } from './mailer';
import { ticketRaisedEmail } from '@/lib/emails';
import { retryOnConflict } from './conflict';

/**
 * A client asking us for something, from the requests form or from the
 * portal assistant. Both land in the same queue by the same path.
 *
 * The request is written before anyone is emailed. A mail outage delays the
 * alert; it never loses a request somebody took the trouble to write.
 */

/** TCK-2026-014, on the same rule as every other reference here. */
async function nextTicketReference(tx: Prisma.TransactionClient, now = new Date()) {
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

export async function createTicket(input: {
  actor: ClientActor;
  kind: TicketKind;
  subject: string;
  body: string;
  project: { id: string; name: string } | null;
  /** Said in the audit line and the alert, e.g. "the portal assistant". */
  via?: string;
}) {
  const { actor, kind, subject, body, project } = input;

  const ticket = await retryOnConflict(() => db.$transaction(async (tx) => {
    const reference = await nextTicketReference(tx);
    return tx.ticket.create({
      data: {
        reference,
        clientId: actor.clientId,
        projectId: project?.id ?? null,
        openedById: actor.id,
        kind,
        subject,
        messages: {
          create: { actorType: 'client_contact', actorId: actor.id, body },
        },
      },
      select: { id: true, reference: true },
    });
  }));

  await recordAudit({
    actorType: 'client_contact',
    actorId: actor.id,
    action: 'ticket.raised',
    entityType: 'Ticket',
    entityId: ticket.id,
    summary: `${ticket.reference}: ${subject}${input.via ? ` (from ${input.via})` : ''}`,
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
      kind,
      subject,
      body,
      projectName: project?.name ?? null,
      url: `${consoleEnv.adminOrigin}/requests/${ticket.reference}`,
    }),
    template: 'ticket_raised',
    entityType: 'Ticket',
    entityId: ticket.id,
  });

  return ticket;
}
