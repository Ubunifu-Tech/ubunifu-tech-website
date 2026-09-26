import 'server-only';
import { headers } from 'next/headers';
import { db } from '@/lib/db';
import type { ActorType, MagicTokenPurpose, Prisma } from '@/generated/prisma/client';
import { generateToken, hashToken } from './crypto';

/**
 * Single-use, short-lived links.
 *
 * Used for two things that look the same underneath: signing in without a
 * password, and granting access to one document, invoice or update without an
 * account at all. Both are a hashed row with an expiry that is burned on use.
 *
 * Only the hash is stored. The raw token exists in the sent email and nowhere
 * else, so reading the database gives an attacker nothing to replay.
 */

const TTL_MINUTES: Record<MagicTokenPurpose, number> = {
  /** Short, because it is a credential arriving in an inbox. */
  sign_in: 20,
  /** A new client may not open the invitation the same day. */
  invite: 60 * 24 * 14,
  /** Longer: a client may open a contract days after it is sent. */
  document_access: 60 * 24 * 14,
  invoice_access: 60 * 24 * 30,
  update_access: 60 * 24 * 30,
  /** Short for the same reason as a sign-in link, with time to think of a password. */
  password_reset: 30,
  /** Long enough for someone who does not check messages daily. */
  shared_link: 60 * 24 * 14,
};

export type IssuedLink = {
  /** Include this in the email. It is not recoverable afterwards. */
  token: string;
};

export async function issueMagicToken(options: {
  purpose: MagicTokenPurpose;
  actorType: ActorType;
  actorId: string;
  entityType?: string;
  entityId?: string;
}): Promise<IssuedLink> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + TTL_MINUTES[options.purpose] * 60_000);
  const headerList = await headers();

  await db.magicToken.create({
    data: {
      tokenHash: hashToken(token),
      purpose: options.purpose,
      actorType: options.actorType,
      actorId: options.actorId,
      entityType: options.entityType,
      entityId: options.entityId,
      expiresAt,
      ip:
        headerList.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ??
        headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        null,
    },
  });

  return { token };
}

export type ConsumedToken = {
  actorType: ActorType;
  actorId: string;
  purpose: MagicTokenPurpose;
  entityType: string | null;
  entityId: string | null;
};

/**
 * Burns the token and returns what it granted, or null.
 *
 * The update is conditional on usedAt still being null, and updateMany reports
 * how many rows it changed — so two requests racing on the same link cannot
 * both win. Whichever one flips the row first is the only one that gets a
 * session; the other sees zero rows and is turned away.
 */
export async function consumeMagicToken(
  rawToken: string,
  expected: MagicTokenPurpose | readonly MagicTokenPurpose[],
): Promise<ConsumedToken | null> {
  const tokenHash = hashToken(rawToken);
  const accepted: readonly MagicTokenPurpose[] = Array.isArray(expected) ? expected : [expected];

  const token = await db.magicToken.findUnique({ where: { tokenHash } });
  if (!token) return null;
  if (!accepted.includes(token.purpose)) return null;
  if (token.usedAt) return null;
  if (token.expiresAt.getTime() <= Date.now()) return null;

  const claimed = await db.magicToken.updateMany({
    where: { id: token.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (claimed.count !== 1) return null;

  return {
    actorType: token.actorType,
    actorId: token.actorId,
    purpose: token.purpose,
    entityType: token.entityType,
    entityId: token.entityId,
  };
}

/**
 * Whether a link would still sign someone in, without burning it.
 *
 * For the page a link opens on. Link previews in WhatsApp, iMessage and mail
 * scanners fetch a URL before the person taps it, so opening the link must
 * change nothing; the token is only consumed when the person presses Continue.
 */
export async function checkMagicToken(
  rawToken: string,
  expected: readonly MagicTokenPurpose[],
): Promise<ConsumedToken | null> {
  const token = await db.magicToken.findUnique({ where: { tokenHash: hashToken(rawToken) } });
  if (!token) return null;
  if (!expected.includes(token.purpose)) return null;
  if (token.usedAt) return null;
  if (token.expiresAt.getTime() <= Date.now()) return null;

  return {
    actorType: token.actorType,
    actorId: token.actorId,
    purpose: token.purpose,
    entityType: token.entityType,
    entityId: token.entityId,
  };
}

/**
 * What a link was for, even once it has been used or has run out. It grants
 * nothing: it lets the page an old link opens send the person somewhere
 * useful, rather than to a dead end.
 */
export async function readLink(
  rawToken: string,
  expected: readonly MagicTokenPurpose[],
): Promise<ConsumedToken | null> {
  const token = await db.magicToken.findUnique({ where: { tokenHash: hashToken(rawToken) } });
  if (!token || !expected.includes(token.purpose)) return null;
  return {
    actorType: token.actorType,
    actorId: token.actorId,
    purpose: token.purpose,
    entityType: token.entityType,
    entityId: token.entityId,
  };
}

/** Invalidates outstanding links of one or more purposes, e.g. after a password change. */
export async function revokeMagicTokens(
  actorType: ActorType,
  actorId: string,
  purpose: MagicTokenPurpose | readonly MagicTokenPurpose[],
): Promise<number> {
  const purposes: MagicTokenPurpose[] = typeof purpose === 'string' ? [purpose] : [...purpose];
  const result = await db.magicToken.updateMany({
    where: { actorType, actorId, purpose: { in: purposes }, usedAt: null },
    data: { usedAt: new Date() },
  });
  return result.count;
}

/**
 * Burns every outstanding link, of every purpose, for these people at once.
 *
 * Takes the caller's transaction so removing a client ends its people's
 * access in the same commit that removes it: a link issued a moment earlier
 * cannot outlive the removal. The verify route re-checks the contact anyway;
 * this makes the link itself dead rather than relying on that check alone.
 */
export async function revokeEveryMagicToken(
  tx: Prisma.TransactionClient,
  actorType: ActorType,
  actorIds: string[],
): Promise<number> {
  if (actorIds.length === 0) return 0;
  const result = await tx.magicToken.updateMany({
    where: { actorType, actorId: { in: actorIds }, usedAt: null },
    data: { usedAt: new Date() },
  });
  return result.count;
}
