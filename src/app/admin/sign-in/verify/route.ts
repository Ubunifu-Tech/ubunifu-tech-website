import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { consoleEnv, isAdminHost, isStaffEmailAllowed } from '@/lib/console/env';
import { consumeMagicToken } from '@/lib/console/magic-link';
import { createSession } from '@/lib/console/session';
import { recordAudit } from '@/lib/console/auth';

/**
 * Burns a staff sign-in link and starts a session.
 *
 * A GET that changes state is unusual, and deliberate: the link is followed
 * from an email client, which cannot POST. The protections that matter are that
 * the token is single-use, short-lived, and useless once consumed — so a link
 * sitting in an inbox or a proxy log cannot be replayed.
 */
export async function GET(request: NextRequest) {
  // Defence in depth. Middleware only rewrites this path on the admin host, but
  // a session must never be mintable from the public origin.
  if (!isAdminHost(request.headers.get('host'))) {
    return new NextResponse(null, { status: 404 });
  }

  const token = request.nextUrl.searchParams.get('token');
  const signIn = new URL('/sign-in', consoleEnv.adminOrigin);

  if (!token) {
    signIn.searchParams.set('error', 'missing');
    return NextResponse.redirect(signIn);
  }

  // An invitation is a first sign-in with a longer life, so both are accepted.
  const claim = await consumeMagicToken(token, ['sign_in', 'invite']);
  if (!claim || claim.actorType !== 'staff') {
    signIn.searchParams.set('error', 'expired');
    return NextResponse.redirect(signIn);
  }

  const staff = await db.staffUser.findUnique({ where: { id: claim.actorId } });

  // Re-checked at the moment of use, not only when the link was sent. An
  // address removed from the allowlist in the meantime cannot still walk in.
  if (
    !staff ||
    !staff.isActive ||
    !isStaffEmailAllowed(staff.email)
  ) {
    await recordAudit({
      actorType: 'system',
      action: 'staff.sign_in.rejected_at_use',
      entityType: 'StaffUser',
      entityId: claim.actorId,
      summary: 'Account inactive or no longer on the allowlist',
    });
    signIn.searchParams.set('error', 'expired');
    return NextResponse.redirect(signIn);
  }

  await createSession({ actorType: 'staff', actorId: staff.id, audience: 'admin' });
  await db.staffUser.update({
    where: { id: staff.id },
    data: { lastSeenAt: new Date() },
  });
  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'staff.sign_in.success',
    entityType: 'StaffUser',
    entityId: staff.id,
  });

  return NextResponse.redirect(new URL('/', consoleEnv.adminOrigin));
}
