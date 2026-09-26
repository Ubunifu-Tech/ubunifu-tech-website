import 'server-only';
import { db } from '@/lib/db';
import { consoleEnv } from './env';
import { hashToken } from './crypto';
import { issueMagicToken } from './magic-link';

/**
 * Links staff send by hand, for people who do not use email or a portal.
 *
 * Each one lets one person do one thing: sign one document, or answer one
 * review. It opens that thing and nothing else, never starts a portal
 * session, and is never accepted by the sign-in route. It lasts fourteen
 * days, and making a new one for the same thing ends the old one, so a link
 * sent to the wrong chat can be replaced.
 *
 * Opening it changes nothing, because chat apps fetch a link to preview it
 * before anyone taps it. What the person does with it is recorded against
 * them, with the note that it came through a shared link.
 */

export type SharedThing = 'SignatureRequest' | 'ProjectReview';

export async function issueSharedLink(input: {
  contactId: string;
  thing: SharedThing;
  thingId: string;
}): Promise<string> {
  await db.magicToken.updateMany({
    where: {
      purpose: 'shared_link',
      entityType: input.thing,
      entityId: input.thingId,
      usedAt: null,
    },
    data: { usedAt: new Date() },
  });
  const { token } = await issueMagicToken({
    purpose: 'shared_link',
    actorType: 'client_contact',
    actorId: input.contactId,
    entityType: input.thing,
    entityId: input.thingId,
  });
  return `${consoleEnv.publicOrigin}/portal/link/${encodeURIComponent(token)}`;
}

export type SharedLink = {
  thing: SharedThing;
  thingId: string;
  contact: { id: string; name: string; email: string | null; clientId: string; clientName: string };
};

/**
 * What a link is for and who it was given to, or null when it is unknown,
 * replaced, out of date, or the person no longer has access.
 */
export async function readSharedLink(rawToken: string): Promise<SharedLink | null> {
  if (!rawToken) return null;
  const token = await db.magicToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    select: {
      purpose: true,
      actorType: true,
      actorId: true,
      entityType: true,
      entityId: true,
      usedAt: true,
      expiresAt: true,
    },
  });
  if (!token || token.purpose !== 'shared_link' || token.actorType !== 'client_contact') {
    return null;
  }
  if (token.usedAt || token.expiresAt.getTime() <= Date.now() || !token.entityId) return null;
  if (token.entityType !== 'SignatureRequest' && token.entityType !== 'ProjectReview') return null;

  // Removing someone, or turning their access off, ends their links too.
  const contact = await db.clientContact.findFirst({
    where: { id: token.actorId, deletedAt: null, canSignIn: true, client: { deletedAt: null } },
    select: {
      id: true,
      name: true,
      email: true,
      clientId: true,
      client: { select: { name: true } },
    },
  });
  if (!contact) return null;

  return {
    thing: token.entityType,
    thingId: token.entityId,
    contact: {
      id: contact.id,
      name: contact.name,
      email: contact.email,
      clientId: contact.clientId,
      clientName: contact.client.name,
    },
  };
}
