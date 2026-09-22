import 'server-only';
import { cookies, headers } from 'next/headers';
import { db } from '@/lib/db';
import type { ActorType } from '@/generated/prisma/client';
import { generateToken, hashToken } from './crypto';
import { consoleEnv } from './env';

/**
 * Sessions for both audiences.
 *
 * The two cookies have different names AND are never given a Domain attribute,
 * so the admin cookie is scoped to admin.ubunifutech.com by the browser and is
 * not sent to the marketing host at all. The `audience` column is the second
 * lock: even if a cookie were replayed against the wrong host, the lookup
 * checks the audience it was issued for.
 */

export const STAFF_COOKIE = 'ubu_console_staff';
export const CLIENT_COOKIE = 'ubu_portal_client';

export type Audience = 'admin' | 'portal';

const SESSION_TTL_MS = {
  /** Staff sit in the console all day; a week is a reasonable compromise. */
  admin: 7 * 24 * 60 * 60 * 1000,
  /** Clients visit rarely, so a longer window saves needless re-authentication. */
  portal: 30 * 24 * 60 * 60 * 1000,
} as const;

function cookieNameFor(audience: Audience): string {
  return audience === 'admin' ? STAFF_COOKIE : CLIENT_COOKIE;
}

async function requestContext() {
  const headerList = await headers();
  return {
    ip:
      headerList.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ??
      headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      null,
    userAgent: headerList.get('user-agent'),
  };
}

export async function createSession(options: {
  actorType: ActorType;
  actorId: string;
  audience: Audience;
}): Promise<void> {
  const { actorType, actorId, audience } = options;
  const token = generateToken();
  const { ip, userAgent } = await requestContext();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS[audience]);

  await db.session.create({
    data: {
      tokenHash: hashToken(token),
      actorType,
      actorId,
      audience,
      ip,
      userAgent,
      expiresAt,
    },
  });

  const jar = await cookies();
  jar.set(cookieNameFor(audience), token, {
    httpOnly: true,
    // Lax rather than Strict: a magic link arrives from an email client as a
    // top-level navigation, and Strict would drop the cookie on that first hop.
    sameSite: 'lax',
    secure: consoleEnv.isProduction,
    path: '/',
    expires: expiresAt,
  });
}

export type SessionActor = {
  sessionId: string;
  actorType: ActorType;
  actorId: string;
  audience: Audience;
};

/**
 * Reads and validates the session for one audience. Returns null rather than
 * throwing, so callers decide whether a missing session is a redirect or a 404.
 */
export async function readSession(
  audience: Audience,
): Promise<SessionActor | null> {
  const jar = await cookies();
  const token = jar.get(cookieNameFor(audience))?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
  });

  if (!session) return null;
  if (session.audience !== audience) return null;
  if (session.revokedAt) return null;
  if (session.expiresAt.getTime() <= Date.now()) return null;

  // Cheap liveness signal; not awaited into the critical path of every render.
  void db.session
    .update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {
      // A failed heartbeat must never break a page render.
    });

  return {
    sessionId: session.id,
    actorType: session.actorType,
    actorId: session.actorId,
    audience,
  };
}

export async function destroySession(audience: Audience): Promise<void> {
  const jar = await cookies();
  const name = cookieNameFor(audience);
  const token = jar.get(name)?.value;

  if (token) {
    await db.session
      .updateMany({
        where: { tokenHash: hashToken(token), revokedAt: null },
        data: { revokedAt: new Date() },
      })
      .catch(() => {
        // Clearing the cookie matters more than recording the revocation.
      });
  }

  jar.delete(name);
}

/** Used when a password changes: every other session for that actor dies. */
export async function revokeAllSessions(
  actorType: ActorType,
  actorId: string,
): Promise<number> {
  const result = await db.session.updateMany({
    where: { actorType, actorId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return result.count;
}
