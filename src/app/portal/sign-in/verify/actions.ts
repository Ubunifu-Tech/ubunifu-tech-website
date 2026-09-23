'use server';

import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { consumeMagicToken } from '@/lib/console/magic-link';
import { createSession } from '@/lib/console/session';
import { recordAudit } from '@/lib/console/auth';
import { CLIENT_LINKS, landingFor } from '@/lib/console/client-links';

/**
 * Burns a client sign-in link and starts a portal session.
 *
 * Only the Continue button on the link's page gets here, never the link
 * itself: a link preview fetching the URL must not spend a single-use link
 * before the person it was sent to has tapped it.
 *
 * The same action serves an invitation and an ordinary sign-in. Which one it
 * was is decided by the account, not by the link: an unactivated contact is
 * sent to finish setting up, everyone else goes to the portal. That means an
 * invitation cannot be re-used as a way to skip activation, and a normal link
 * cannot drop someone back into the setup form.
 */
export async function continueWithLink(formData: FormData): Promise<void> {
  const token = String(formData.get('token') ?? '');
  if (!token) redirect('/portal/sign-in?error=missing');

  const claim = await consumeMagicToken(token, CLIENT_LINKS);
  if (!claim || claim.actorType !== 'client_contact') {
    redirect('/portal/sign-in?error=expired');
  }

  const contact = await db.clientContact.findUnique({
    where: { id: claim.actorId },
    select: {
      id: true,
      clientId: true,
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
    redirect('/portal/sign-in?error=expired');
  }

  // An invitation or setup link is for setting up. Once the account has a
  // password it is no longer a way in: a copy left in a chat or an inbox
  // would otherwise open an account without its password.
  if (claim.purpose === 'invite' && contact.activatedAt) {
    await recordAudit({
      actorType: 'system',
      action: 'client.invite.refused',
      entityType: 'ClientContact',
      entityId: contact.id,
      summary: 'An old setup link was used after the account was set up',
    });
    redirect('/portal/sign-in?error=set-up');
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

  // Someone who has not set a password finishes that first, whatever the link
  // was for; the thing it pointed at is one click away from the portal home.
  redirect(contact.activatedAt ? await landingFor(claim, contact.clientId) : '/portal/activate');
}
