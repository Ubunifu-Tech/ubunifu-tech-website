import 'server-only';
import { db } from '@/lib/db';
import type { Prisma, TicketKind } from '@/generated/prisma/client';
import type { AgentTool } from './agent';
import type { ClientActor } from './auth';
import { createTicket } from './ticket-create';
import { RAISE_REQUEST_SPEC, REQUEST_KINDS } from './portal-brief';

export { PORTAL_SYSTEM, portalBrief } from './portal-brief';
export type { PortalContext } from './portal-brief';
import type { PortalContext } from './portal-brief';

/**
 * The assistant in the client portal.
 *
 * It can see one client's records and nothing else. The brief is built on the
 * server from the signed-in contact's own client id, never from anything the
 * conversation says, so asking about another company finds nothing to leak.
 * It has one tool: raising a request for the team, which is the same request
 * the portal form raises.
 */

const KINDS = REQUEST_KINDS;

/** The whole chat, for the request a person will read. */
async function transcript(conversationId: string): Promise<string> {
  const messages = await db.conversationMessage.findMany({
    where: { conversationId, role: { in: ['user', 'assistant'] } },
    orderBy: { createdAt: 'asc' },
    take: 40,
    select: { role: true, content: true },
  });
  return messages
    .filter((message) => message.content.trim())
    .map((message) => `${message.role === 'user' ? 'Client' : 'Assistant'}: ${message.content.trim()}`)
    .join('\n\n');
}

async function projectFor(actor: ClientActor, hint: string | null) {
  if (!hint) return null;
  const projects = await db.project.findMany({
    where: { clientId: actor.clientId, deletedAt: null },
    select: { id: true, name: true, reference: true, slug: true },
  });
  const wanted = hint.toLowerCase();
  return (
    projects.find(
      (project) =>
        project.reference.toLowerCase() === wanted ||
        project.slug === wanted ||
        project.name.toLowerCase() === wanted,
    ) ?? null
  );
}

/**
 * Raises a request with the chat attached, and links the two. Used by the
 * tool and by the "Talk to a person" button, which needs no model at all.
 */
export async function handOff(input: {
  actor: ClientActor;
  conversationId: string | null;
  subject: string;
  details: string;
  kind?: TicketKind;
  projectHint?: string | null;
}) {
  // Attached only when there was a conversation: the client's own words alone
  // are already the details, and repeating them helps nobody.
  const chat = input.conversationId ? await transcript(input.conversationId) : '';
  const attach = chat.includes('\n\nAssistant: ') || chat.startsWith('Assistant: ');
  const project = await projectFor(input.actor, input.projectHint ?? null);

  const ticket = await createTicket({
    actor: input.actor,
    kind: input.kind ?? 'question',
    subject: input.subject,
    body: attach ? `${input.details}\n\nThe chat so far:\n\n${chat}`.slice(0, 8000) : input.details,
    project,
    via: 'the portal assistant',
  });

  if (input.conversationId) {
    await db.conversation.update({
      where: { id: input.conversationId },
      data: { ticketId: ticket.id, status: 'converted', title: input.subject },
    });
  }

  return ticket;
}

export const raiseRequestTool: AgentTool<PortalContext> = {
  ...RAISE_REQUEST_SPEC,
  run: async (input, context) => {
    const { subject, details, kind, project } = (input ?? {}) as Record<string, unknown>;
    const cleanSubject = typeof subject === 'string' ? subject.trim().slice(0, 160) : '';
    const cleanDetails = typeof details === 'string' ? details.trim().slice(0, 4000) : '';

    if (cleanSubject.length < 4 || cleanDetails.length < 10) {
      return { result: 'Write a fuller subject and details, then try again.', done: false };
    }

    const existing = await db.conversation.findUnique({
      where: { id: context.conversationId },
      select: { ticket: { select: { reference: true } } },
    });
    if (existing?.ticket) {
      return {
        result: `A request from this chat already exists: ${existing.ticket.reference}, page /portal/requests/${existing.ticket.reference}. Tell them to add to it there.`,
        done: false,
      };
    }

    const ticket = await handOff({
      actor: context.actor,
      conversationId: context.conversationId,
      subject: cleanSubject,
      details: cleanDetails,
      kind: KINDS.includes(kind as TicketKind) ? (kind as TicketKind) : 'question',
      projectHint: typeof project === 'string' ? project.trim().slice(0, 120) : null,
    });

    return {
      result: `Raised ${ticket.reference}. Its page is /portal/requests/${ticket.reference}. Give them both.`,
      meta: { ticketId: ticket.id, reference: ticket.reference } satisfies Prisma.InputJsonValue,
    };
  },
};
