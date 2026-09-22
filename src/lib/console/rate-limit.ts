import 'server-only';
import { db } from '@/lib/db';
import type { ActorType, MagicTokenPurpose } from '@/generated/prisma/client';

/**
 * Throttles link requests, counted in the database rather than in memory.
 *
 * An in-memory counter is worthless on Vercel: each function instance keeps its
 * own, so the real limit is the cap multiplied by however many instances happen
 * to be warm. Counting rows we already write costs one query and holds across
 * the whole deployment.
 */

const WINDOW_MINUTES = 15;
const MAX_PER_WINDOW = 5;

export async function tooManyLinkRequests(options: {
  actorType: ActorType;
  actorId: string;
  purpose: MagicTokenPurpose;
}): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000);

  const recent = await db.magicToken.count({
    where: {
      actorType: options.actorType,
      actorId: options.actorId,
      purpose: options.purpose,
      createdAt: { gte: since },
    },
  });

  return recent >= MAX_PER_WINDOW;
}

/**
 * Password attempts, tracked on the contact so a lockout survives redeploys.
 *
 * The lock is short and the magic-link route stays open throughout, so this
 * slows an attacker without ever leaving a real client unable to get in.
 */
const MAX_FAILED_SIGN_INS = 8;
const LOCK_MINUTES = 15;

export function isLocked(contact: {
  lockedUntil: Date | null;
}): boolean {
  return contact.lockedUntil !== null && contact.lockedUntil.getTime() > Date.now();
}

export async function recordFailedSignIn(contactId: string): Promise<void> {
  const contact = await db.clientContact.findUnique({
    where: { id: contactId },
    select: { failedSignIns: true },
  });
  if (!contact) return;

  const failed = contact.failedSignIns + 1;
  await db.clientContact.update({
    where: { id: contactId },
    data: {
      failedSignIns: failed,
      lockedUntil:
        failed >= MAX_FAILED_SIGN_INS
          ? new Date(Date.now() + LOCK_MINUTES * 60_000)
          : null,
    },
  });
}

export async function clearFailedSignIns(contactId: string): Promise<void> {
  await db.clientContact.update({
    where: { id: contactId },
    data: { failedSignIns: 0, lockedUntil: null, lastSeenAt: new Date() },
  });
}
