import 'server-only';
import { createHash } from 'node:crypto';
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

/**
 * A general limit: at most `limit` attempts per `windowMinutes` for one key in
 * one bucket. Returns true when this attempt is allowed, and records it.
 *
 * Keys are hashed with the session secret, so the table never holds a raw IP
 * or email address. A database failure allows the attempt: a throttle that
 * locks everybody out when Postgres blinks does more harm than the abuse.
 */
export async function allow(
  bucket: string,
  key: string | null | undefined,
  { limit, windowMinutes }: { limit: number; windowMinutes: number },
): Promise<boolean> {
  if (!key) return true;
  const keyHash = createHash('sha256')
    .update(`${process.env.CONSOLE_SESSION_SECRET ?? ''}:${bucket}:${key.toLowerCase()}`)
    .digest('hex');

  try {
    const since = new Date(Date.now() - windowMinutes * 60_000);
    const recent = await db.rateLimitHit.count({
      where: { bucket, keyHash, createdAt: { gte: since } },
    });
    if (recent >= limit) return false;

    await db.rateLimitHit.create({ data: { bucket, keyHash } });

    // Old rows are swept now and then rather than by a cron job.
    if (Math.random() < 0.02) {
      await db.rateLimitHit.deleteMany({
        where: { createdAt: { lt: new Date(Date.now() - 2 * 24 * 60 * 60_000) } },
      });
    }
    return true;
  } catch (error) {
    console.error(`[rate-limit] ${bucket} could not be checked`, error);
    return true;
  }
}

/** The caller's address, as Vercel reports it. */
export function requestIp(headers: Headers): string | null {
  return (
    headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ??
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headers.get('x-real-ip')?.trim() ??
    null
  );
}
