import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { consoleEnv, isAdminHost, isStaffEmailAllowed } from '@/lib/console/env';
import { consumeMagicToken } from '@/lib/console/magic-link';
import { createSession } from '@/lib/console/session';
import { recordAudit } from '@/lib/console/auth';

/**
 * Burns a staff sign-in link and starts a session.
 *
 * Posted by the Continue button on the page the link opens, never reached by
 * the link itself, so a mail scanner or a chat preview that fetches the URL
 * cannot spend it first. The token is single-use and short-lived, so a link
 * sitting in an inbox or a proxy log cannot be replayed.
 *
 * A route rather than a server action because it has to end in a real HTTP
 * redirect. An action's redirect is rendered in the same request, without the
 * admin host's rewrite, so "/" came back as the public home page. A 303 sends
 * the browser to the console through the rewrite like any other page.
 */
export async function POST(request: NextRequest) {
  // Defence in depth. The proxy only rewrites this path on the admin host, but
  // a session must never be mintable from the public origin.
  if (!isAdminHost(request.headers.get('host'))) {
    return new NextResponse(null, { status: 404 });
  }

  const home = new URL(consoleEnv.adminOrigin);
  const go = (path: string) => NextResponse.redirect(new URL(path, home), 303);

  // Only our own Continue page posts here. Without this, another site could
  // post a link of its own and sign the visitor into somebody else's account.
  if (request.headers.get('origin') !== home.origin) return go('/sign-in?error=expired');

  const form = await request.formData().catch(() => null);
  const token = String(form?.get('token') ?? '');
  if (!token) return go('/sign-in?error=missing');

  // An invitation is a first sign-in with a longer life, so both are accepted.
  const claim = await consumeMagicToken(token, ['sign_in', 'invite']);
  if (!claim || claim.actorType !== 'staff') return go('/sign-in?error=expired');

  const staff = await db.staffUser.findUnique({ where: { id: claim.actorId } });

  // Re-checked at the moment of use, not only when the link was sent. An
  // address removed from the allowlist in the meantime cannot still walk in.
  if (!staff || !staff.isActive || !isStaffEmailAllowed(staff.email)) {
    await recordAudit({
      actorType: 'system',
      action: 'staff.sign_in.rejected_at_use',
      entityType: 'StaffUser',
      entityId: claim.actorId,
      summary: 'Account inactive or no longer on the allowlist',
    });
    return go('/sign-in?error=expired');
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

  return go('/');
}
