import 'server-only';
import { headers } from 'next/headers';
import { db } from '@/lib/db';
import type { ActorType, MagicTokenPurpose } from '@/generated/prisma/client';
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
  /** Longer: a client may open a contract days after it is sent. */
  document_access: 60 * 24 * 14,
  invoice_access: 60 * 24 * 30,
  update_access: 60 * 24 * 30,
};

export type IssuedLink = {
  /** Include this in the email. It is not recoverable afterwards. */
  token: string;
  expiresAt: Date;
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

  return { token, expiresAt };
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
  expected: MagicTokenPurpose,
): Promise<ConsumedToken | null> {
  const tokenHash = hashToken(rawToken);

  const token = await db.magicToken.findUnique({ where: { tokenHash } });
  if (!token) return null;
  if (token.purpose !== expected) return null;
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
 * Checks a link without burning it, for the "view this document" case where a
 * client may open the same link more than once.
 */
export async function peekMagicToken(
  rawToken: string,
  expected: MagicTokenPurpose,
): Promise<ConsumedToken | null> {
  const token = await db.magicToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
  });

  if (!token) return null;
  if (token.purpose !== expected) return null;
  if (token.expiresAt.getTime() <= Date.now()) return null;

  return {
    actorType: token.actorType,
    actorId: token.actorId,
    purpose: token.purpose,
    entityType: token.entityType,
    entityId: token.entityId,
  };
}

/** Invalidates outstanding links of one purpose, e.g. after a password change. */
export async function revokeMagicTokens(
  actorType: ActorType,
  actorId: string,
  purpose: MagicTokenPurpose,
): Promise<number> {
  const result = await db.magicToken.updateMany({
    where: { actorType, actorId, purpose, usedAt: null },
    data: { usedAt: new Date() },
  });
  return result.count;
}
