import { NextResponse } from 'next/server';
import { consoleEnv } from '@/lib/console/env';
import { destroySession, readSession } from '@/lib/console/session';
import { recordAudit } from '@/lib/console/auth';

/** POST only, for the same reason as the console's: a GET sign-out can be
 *  triggered by any image tag on any page. */
export async function POST() {
  const session = await readSession('portal');
  if (session) {
    await recordAudit({
      actorType: 'client_contact',
      actorId: session.actorId,
      action: 'client.sign_out',
      entityType: 'ClientContact',
      entityId: session.actorId,
    });
  }
  await destroySession('portal');

  // To the portal's own address, not the one this request carries: behind the
  // proxy that can be the server's own origin, where there is no sign-in page.
  return NextResponse.redirect(new URL('/sign-in', consoleEnv.portalOrigin), { status: 303 });
}
