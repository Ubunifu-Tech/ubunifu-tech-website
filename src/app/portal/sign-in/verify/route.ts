import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { consumeMagicToken } from '@/lib/console/magic-link';
import { createSession } from '@/lib/console/session';
import { recordAudit } from '@/lib/console/auth';

/**
 * Burns a client sign-in link and starts a portal session.
 *
 * The same route serves an invitation and an ordinary sign-in. Which one it was
 * is decided by the account, not by the link: an unactivated contact is sent to
 * finish setting up, everyone else goes to the portal. That means an invitation
 * cannot be re-used as a way to skip activation, and a normal link cannot drop
 * someone back into the setup form.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  const origin = new URL(request.url).origin;
  const signIn = new URL('/portal/sign-in', origin);

  if (!token) {
    signIn.searchParams.set('error', 'missing');
    return NextResponse.redirect(signIn);
  }

  const claim = await consumeMagicToken(token, 'sign_in');
  if (!claim || claim.actorType !== 'client_contact') {
    signIn.searchParams.set('error', 'expired');
    return NextResponse.redirect(signIn);
  }

  const contact = await db.clientContact.findUnique({
    where: { id: claim.actorId },
    select: {
      id: true,
      canSignIn: true,
      deletedAt: true,
      activatedAt: true,
      client: { select: { deletedAt: true } },
    },
  });

  // Re-checked at the moment of use: access revoked after the link was sent
  // must not still let someone in.
  if (!contact || !contact.canSignIn || contact.deletedAt || contact.client.deletedAt) {
    await recordAudit({
      actorType: 'system',
      action: 'client.sign_in.rejected_at_use',
      entityType: 'ClientContact',
      entityId: claim.actorId,
      summary: 'Contact removed or portal access revoked',
    });
    signIn.searchParams.set('error', 'expired');
    return NextResponse.redirect(signIn);
  }

  await createSession({
    actorType: 'client_contact',
    actorId: contact.id,
    audience: 'portal',
  });
  await db.clientContact.update({
    where: { id: contact.id },
    data: { lastSeenAt: new Date(), failedSignIns: 0, lockedUntil: null },
  });
  await recordAudit({
    actorType: 'client_contact',
    actorId: contact.id,
    action: contact.activatedAt ? 'client.sign_in.success' : 'client.invite.opened',
    entityType: 'ClientContact',
    entityId: contact.id,
  });

  return NextResponse.redirect(
    new URL(contact.activatedAt ? '/portal' : '/portal/activate', origin),
  );
}
