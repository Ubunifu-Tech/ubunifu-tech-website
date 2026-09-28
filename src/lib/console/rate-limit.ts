import 'server-only';
import { createHash } from 'node:crypto';
import { db } from '@/lib/db';
import { consoleEnv } from './env';
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

/**
 * Takes one password attempt for this account before the password is checked,
 * and says whether it may be checked at all. Taken first, and counted in one
 * statement, so guesses sent all at once are each counted before any of them
 * is tried: no more than the limit get through however many arrive together.
 * The last one allowed locks the account behind it. A lock that has run its
 * course starts the count again, and a right password clears it.
 */
export async function takeSignInAttempt(contactId: string): Promise<boolean> {
  await db.clientContact.updateMany({
    where: { id: contactId, lockedUntil: { lte: new Date() } },
    data: { failedSignIns: 0, lockedUntil: null },
  });
  const { failedSignIns } = await db.clientContact.update({
    where: { id: contactId },
    data: { failedSignIns: { increment: 1 } },
    select: { failedSignIns: true },
  });
  if (failedSignIns < MAX_FAILED_SIGN_INS) return true;
  await db.clientContact.updateMany({
    where: { id: contactId, lockedUntil: null },
    data: { lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) },
  });
  return failedSignIns === MAX_FAILED_SIGN_INS;
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
 * or email address. A missing secret throws before anything is written, so the
 * caller reports its failure instead of counting under an unkeyed hash. A
 * database failure allows the attempt: a throttle that locks everybody out
 * when Postgres blinks does more harm than the abuse.
 */
export async function allow(
  bucket: string,
  key: string | null | undefined,
  { limit, windowMinutes }: { limit: number; windowMinutes: number },
): Promise<boolean> {
  if (!key) return true;
  const keyHash = createHash('sha256')
    .update(`${consoleEnv.sessionSecret}:${bucket}:${key.toLowerCase()}`)
    .digest('hex');

  try {
    // Recorded before counting, so attempts arriving together each see the
    // others: whichever lands past the limit is refused, rather than all of
    // them counting the same few rows and going through.
    await db.rateLimitHit.create({ data: { bucket, keyHash } });
    const since = new Date(Date.now() - windowMinutes * 60_000);
    const recent = await db.rateLimitHit.count({
      where: { bucket, keyHash, createdAt: { gte: since } },
    });
    if (recent > limit) return false;

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

/**
 * How many "we have your message" replies the website sends in a day, from
 * the contact form and the chat together.
 */
export const ACKNOWLEDGEMENTS_PER_DAY = { limit: 150, windowMinutes: 24 * 60 };

/** A number from the environment, or the default when it is unset or not a positive number. */
function tunable(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/**
 * Ceilings on the website chat across the whole site, whoever is asking: the
 * per-visitor limits stop one person, these stop a crowd of scripts from
 * spending the month's model budget in an afternoon.
 */
export const ASSISTANT_SITE_PER_HOUR = {
  limit: tunable('ASSISTANT_SITE_TURNS_PER_HOUR', 60),
  windowMinutes: 60,
};
export const ASSISTANT_SITE_PER_DAY = {
  limit: tunable('ASSISTANT_SITE_TURNS_PER_DAY', 300),
  windowMinutes: 24 * 60,
};

/** "Talk to a person" from the website chat: per address, and per email given. */
export const HANDOFF_PER_IP_HOUR = { limit: 10, windowMinutes: 60 };
export const HANDOFF_PER_IP_DAY = { limit: 20, windowMinutes: 24 * 60 };
export const HANDOFF_PER_EMAIL_HOUR = { limit: 3, windowMinutes: 60 };

/** The contact form, per address in a day, on top of its ten-minute limit. */
export const CONTACT_PER_IP_DAY = { limit: 10, windowMinutes: 24 * 60 };

/**
 * One line on the Activity record when a site-wide limit is reached, and no
 * more for the rest of that window, so staff learn about it without a line
 * per refused visitor. Never throws: a note that cannot be written must not
 * turn a refusal into an error page.
 */
export async function noteCapReached(
  bucket: string,
  action: 'acknowledgement.cap_reached' | 'assistant.site_cap_reached',
  summary: string,
  windowMinutes: number,
): Promise<void> {
  try {
    if (!(await allow(`${bucket}:alert`, 'site', { limit: 1, windowMinutes }))) return;
    await db.auditEvent.create({
      data: { actorType: 'system', action, entityType: 'Site', entityId: bucket, summary },
    });
  } catch (error) {
    console.error('[rate-limit] could not note that a limit was reached', error);
  }
}

/**
 * The caller's address, as Vercel reports it, for counting. An IPv6 address
 * is cut to its /64, the block one connection is usually handed, so moving
 * around inside it does not count as a new caller.
 */
export function requestIp(headers: Headers): string | null {
  const ip =
    headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ??
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headers.get('x-real-ip')?.trim() ??
    null;
  return ip ? networkOf(ip) : null;
}

/**
 * An IPv4 address as it is, including one written the IPv6 way
 * (::ffff:203.0.113.9); an IPv6 one as its first four groups.
 */
function networkOf(ip: string): string {
  const v4 = /(?:^|:)((?:\d{1,3}\.){3}\d{1,3})$/.exec(ip);
  if (v4) return v4[1];
  if (!ip.includes(':')) return ip;
  const [head, tail = ''] = ip.toLowerCase().split('::');
  const front = head ? head.split(':') : [];
  const back = tail ? tail.split(':') : [];
  const groups = ip.includes('::')
    ? [...front, ...Array(Math.max(0, 8 - front.length - back.length)).fill('0'), ...back]
    : front;
  return `${groups.slice(0, 4).map((group) => group.replace(/^0+(?=.)/, '')).join(':')}::/64`;
}
