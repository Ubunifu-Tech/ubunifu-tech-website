import 'server-only';
import { cookies, headers } from 'next/headers';
import { db } from '@/lib/db';
import type { ActorType, Prisma } from '@/generated/prisma/client';
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
  const jar = await cookies();
  const name = cookieNameFor(audience);

  // Whatever session this browser held before ends here, whoever it was for.
  // The new cookie replaces it, and a session nobody holds any more should
  // not stay valid for the rest of its thirty days.
  const replaced = jar.get(name)?.value;
  if (replaced) {
    await db.session
      .updateMany({
        where: { tokenHash: hashToken(replaced), revokedAt: null },
        data: { revokedAt: new Date() },
      })
      .catch(() => {
        // Signing in matters more than recording the old session's end.
      });
  }

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

  // Old rows are swept now and then rather than by a cron job.
  if (Math.random() < 0.02) {
    await sweepExpiredSessions().catch((error) =>
      console.error('[session] old sessions could not be swept', error),
    );
  }

  jar.set(name, token, {
    httpOnly: true,
    // Lax rather than Strict: a magic link arrives from an email client as a
    // top-level navigation, and Strict would drop the cookie on that first hop.
    sameSite: 'lax',
    secure: consoleEnv.isProduction,
    path: '/',
    expires: expiresAt,
  });
}

/**
 * Deletes sessions that ran out more than thirty days ago. A revoked session
 * that has not yet run out stays until it has. The audit trail keeps the
 * record of who signed in and when.
 */
export async function sweepExpiredSessions(): Promise<number> {
  const result = await db.session.deleteMany({
    where: { expiresAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60_000) } },
  });
  return result.count;
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

/**
 * Who the session behind this browser's cookie was for, even once it has
 * been revoked or has run out. It grants nothing: it lets the sign-in page
 * say why someone was signed out. Null when there is no cookie; a cookie
 * with no session behind it gives an actor of null.
 */
export async function cookieSession(
  audience: Audience,
): Promise<{ actorType: ActorType; actorId: string } | { actorType: null; actorId: null } | null> {
  const token = (await cookies()).get(cookieNameFor(audience))?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { audience: true, actorType: true, actorId: true },
  });
  if (!session || session.audience !== audience) return { actorType: null, actorId: null };
  return { actorType: session.actorType, actorId: session.actorId };
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

/**
 * Used when a password is set or changes: every other session for that actor
 * dies. Pass the current session to keep the person who made the change in.
 */
export async function revokeAllSessions(
  actorType: ActorType,
  actorId: string,
  exceptSessionId?: string,
): Promise<number> {
  const result = await db.session.updateMany({
    where: {
      actorType,
      actorId,
      revokedAt: null,
      ...(exceptSessionId ? { NOT: { id: exceptSessionId } } : {}),
    },
    data: { revokedAt: new Date() },
  });
  return result.count;
}

/**
 * Ends every live session for these people, inside the caller's transaction.
 * Used when a client is removed, so nobody stays signed in to a portal for an
 * organisation that is no longer here.
 */
export async function revokeSessionsFor(
  tx: Prisma.TransactionClient,
  actorType: ActorType,
  actorIds: string[],
): Promise<number> {
  if (actorIds.length === 0) return 0;
  const result = await tx.session.updateMany({
    where: { actorType, actorId: { in: actorIds }, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return result.count;
}
