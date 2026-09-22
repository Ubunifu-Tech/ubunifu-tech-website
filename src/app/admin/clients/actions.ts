'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireStaff, recordAudit } from '@/lib/console/auth';
import { consoleEnv } from '@/lib/console/env';
import { issueMagicToken } from '@/lib/console/magic-link';
import { sendConsoleEmail } from '@/lib/console/mailer';
import { clientInviteEmail } from '@/lib/emails';

export type InviteState = { status: 'idle' | 'sent' | 'error'; message?: string };

/**
 * Sends a client their invitation.
 *
 * Staff-only, and requireStaff is called inside the action rather than relied
 * on from the page that rendered the form. A server action is a public endpoint:
 * anyone can post to it, whether or not they ever saw the page.
 */
export async function inviteContact(
  _previous: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const staff = await requireStaff();
  const contactId = String(formData.get('contactId') ?? '');

  const contact = await db.clientContact.findFirst({
    where: { id: contactId, deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      canSignIn: true,
      activatedAt: true,
      client: { select: { name: true, deletedAt: true } },
    },
  });

  if (!contact || contact.client.deletedAt) {
    return { status: 'error', message: 'That contact no longer exists.' };
  }
  if (!contact.canSignIn) {
    return { status: 'error', message: 'Portal access is turned off for this contact.' };
  }

  const { token } = await issueMagicToken({
    purpose: 'sign_in',
    actorType: 'client_contact',
    actorId: contact.id,
  });

  const url = `${consoleEnv.publicOrigin}/portal/sign-in/verify?token=${encodeURIComponent(token)}`;

  // An activated client gets an ordinary sign-in link, not another "set up your
  // account" email telling them to do something they have already done.
  const sent = await sendConsoleEmail({
    to: contact.email,
    subject: contact.activatedAt
      ? 'Sign in to your Ubunifu portal'
      : 'Your Ubunifu project portal is ready',
    html: clientInviteEmail({
      name: contact.name,
      clientName: contact.client.name,
      url,
    }),
    template: contact.activatedAt ? 'client_sign_in' : 'client_invite',
    entityType: 'ClientContact',
    entityId: contact.id,
  });

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: contact.activatedAt ? 'client.sign_in.link_sent' : 'client.invite.sent',
    entityType: 'ClientContact',
    entityId: contact.id,
    summary: `Sent to ${contact.email}`,
  });

  revalidatePath('/admin/clients');

  if (!sent.ok) {
    return { status: 'error', message: `The link was created but not sent: ${sent.error}` };
  }
  return { status: 'sent', message: `Sent to ${contact.email}.` };
}
