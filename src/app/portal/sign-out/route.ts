import { NextResponse, type NextRequest } from 'next/server';
import { consoleEnv } from '@/lib/console/env';
import { destroySession, readSession } from '@/lib/console/session';
import { recordAudit } from '@/lib/console/auth';

/** POST only, for the same reason as the console's: a GET sign-out can be
 *  triggered by any image tag on any page. */
export async function POST(request: NextRequest) {
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

  const origin = new URL(request.url).origin || consoleEnv.publicOrigin;
  return NextResponse.redirect(new URL('/portal/sign-in', origin), { status: 303 });
}
