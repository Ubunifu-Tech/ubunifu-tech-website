import 'server-only';
import { db } from '@/lib/db';
import type { EnquiryStatus, TicketStatus } from '@/generated/prisma/client';
import type { ClientActor } from './auth';
import { MAX_MESSAGES } from './agent';

/**
 * Which chat thread a person is in, decided in one place per surface, so the
 * message route, the hand-off and the history all agree on it.
 *
 * A thread that has run its course is finished rather than refused: the next
 * message quietly starts a fresh one, so a visitor never reaches a dead end.
 * Reading never finishes anything; only writing does, so opening the window
 * cannot close a thread the person is still in.
 */

/** A site thread quiet for longer than this starts afresh. */
const SITE_THREAD_DAYS = 30;

/** A portal thread that became a request is carried on for this long. */
const PORTAL_THREAD_HOURS = 24;

/** An enquiry the team has finished with: a new message is a new enquiry. */
const SETTLED: EnquiryStatus[] = ['converted', 'declined', 'spam'];

/** The enquiry an earlier, finished thread produced, for the next one to name. */
export type PreviousEnquiry = { enquiryId: string; subject: string; createdAt: Date };

export type SiteConversation = { id: string; status: string; messageCount: number };

export async function resolveSiteConversation(
  visitorKey: string,
  { forWrite }: { forWrite: boolean },
): Promise<{ conversation: SiteConversation | null; previous: PreviousEnquiry | null }> {
  const found = await db.conversation.findFirst({
    where: { visitorKey, kind: 'site_visitor', status: { in: ['open', 'converted'] } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      status: true,
      messageCount: true,
      lastMessageAt: true,
      enquiry: {
        select: { id: true, status: true, deletedAt: true, subject: true, createdAt: true },
      },
    },
  });
  if (!found) return { conversation: null, previous: null };

  const quietSince = Date.now() - SITE_THREAD_DAYS * 86_400_000;
  const finished =
    found.messageCount >= MAX_MESSAGES.site_visitor ||
    (found.lastMessageAt !== null && found.lastMessageAt.getTime() < quietSince) ||
    (found.enquiry !== null &&
      (found.enquiry.deletedAt !== null || SETTLED.includes(found.enquiry.status)));

  if (!finished) {
    return {
      conversation: { id: found.id, status: found.status, messageCount: found.messageCount },
      // A thread with no enquiry of its own may follow one that had one.
      previous: forWrite && !found.enquiry ? await earlierEnquiry(visitorKey) : null,
    };
  }
  if (!forWrite) return { conversation: null, previous: null };

  await db.conversation.update({ where: { id: found.id }, data: { status: 'closed' } });
  return {
    conversation: null,
    previous: found.enquiry
      ? {
          enquiryId: found.enquiry.id,
          subject: found.enquiry.subject,
          createdAt: found.enquiry.createdAt,
        }
      : await earlierEnquiry(visitorKey),
  };
}

/** The enquiry from this visitor's latest finished thread, if it produced one. */
async function earlierEnquiry(visitorKey: string): Promise<PreviousEnquiry | null> {
  const closed = await db.conversation.findFirst({
    where: { visitorKey, kind: 'site_visitor', status: 'closed', enquiryId: { not: null } },
    orderBy: { createdAt: 'desc' },
    select: { enquiry: { select: { id: true, subject: true, createdAt: true } } },
  });
  return closed?.enquiry
    ? { enquiryId: closed.enquiry.id, subject: closed.enquiry.subject, createdAt: closed.enquiry.createdAt }
    : null;
}

export async function createSiteConversation(input: {
  visitorKey: string;
  ip: string | null;
  userAgent: string | null;
}): Promise<SiteConversation> {
  return db.conversation.create({
    data: {
      kind: 'site_visitor',
      visitorKey: input.visitorKey,
      ip: input.ip,
      userAgent: input.userAgent,
    },
    select: { id: true, status: true, messageCount: true },
  });
}

export type PortalConversation = {
  id: string;
  status: string;
  messageCount: number;
  ticket: { reference: string; status: TicketStatus } | null;
};

export async function resolvePortalConversation(
  actor: ClientActor,
  { forWrite }: { forWrite: boolean },
): Promise<PortalConversation | null> {
  const found = await db.conversation.findFirst({
    where: {
      kind: 'portal_client',
      actorType: 'client_contact',
      actorId: actor.id,
      status: { in: ['open', 'converted'] },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      status: true,
      messageCount: true,
      lastMessageAt: true,
      ticket: { select: { reference: true, status: true } },
    },
  });
  if (!found) return null;

  // A chat that became a request carries on for a day, so "what did I just
  // ask?" still has its answer; after that, or once the request is closed,
  // a question is a new chat.
  const handedOffLongAgo =
    found.lastMessageAt !== null &&
    found.lastMessageAt.getTime() < Date.now() - PORTAL_THREAD_HOURS * 3_600_000;
  const finished =
    found.messageCount >= MAX_MESSAGES.portal_client ||
    (found.status === 'converted' && (found.ticket?.status === 'closed' || handedOffLongAgo));

  if (!finished) {
    return {
      id: found.id,
      status: found.status,
      messageCount: found.messageCount,
      ticket: found.ticket,
    };
  }
  if (forWrite) {
    await db.conversation.update({ where: { id: found.id }, data: { status: 'closed' } });
  }
  return null;
}

export async function createPortalConversation(
  actor: ClientActor,
  userAgent: string | null,
): Promise<PortalConversation> {
  return db.conversation.create({
    data: {
      kind: 'portal_client',
      actorType: 'client_contact',
      actorId: actor.id,
      clientId: actor.clientId,
      userAgent,
    },
    select: {
      id: true,
      status: true,
      messageCount: true,
      ticket: { select: { reference: true, status: true } },
    },
  });
}
