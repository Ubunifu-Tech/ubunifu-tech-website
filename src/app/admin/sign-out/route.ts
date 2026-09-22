import { NextResponse, type NextRequest } from 'next/server';
import { consoleEnv, isAdminHost } from '@/lib/console/env';
import { destroySession } from '@/lib/console/session';
import { readSession } from '@/lib/console/session';
import { recordAudit } from '@/lib/console/auth';

/**
 * POST only. A GET sign-out can be triggered by any image tag on any page,
 * which is a nuisance rather than a breach, but an avoidable one.
 */
export async function POST(request: NextRequest) {
  if (!isAdminHost(request.headers.get('host'))) {
    return new NextResponse(null, { status: 404 });
  }

  const session = await readSession('admin');
  if (session) {
    await recordAudit({
      actorType: 'staff',
      actorId: session.actorId,
      action: 'staff.sign_out',
      entityType: 'StaffUser',
      entityId: session.actorId,
    });
  }

  await destroySession('admin');
  return NextResponse.redirect(new URL('/sign-in', consoleEnv.adminOrigin), { status: 303 });
}
