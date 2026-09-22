'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireStaff, recordAudit } from '@/lib/console/auth';
import { consoleEnv } from '@/lib/console/env';
import { issueMagicToken } from '@/lib/console/magic-link';
import { sendConsoleEmail } from '@/lib/console/mailer';
import { clientInviteEmail, clientSignInEmail } from '@/lib/emails';

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

  // The purpose decides how long the link lives, and it has to match what the
  // email says: an invitation promises two weeks, a sign-in link twenty minutes.
  const { token } = await issueMagicToken({
    purpose: contact.activatedAt ? 'sign_in' : 'invite',
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
    // Somebody who already has a password was being sent "choose a password
    // and finish setting up your account" under a subject line saying "sign
    // in". The body now matches the subject.
    html: contact.activatedAt
      ? clientSignInEmail({ name: contact.name, url })
      : clientInviteEmail({ name: contact.name, clientName: contact.client.name, url }),
    template: contact.activatedAt ? 'client_sign_in' : 'client_invite',
    entityType: 'ClientContact',
    entityId: contact.id,
  });

  /**
   * The audit line is derived from what actually happened, not from having
   * tried. Recording "sent" against a send that failed puts the audit trail in
   * direct contradiction with the email log, and the audit trail is the one
   * people believe — so the failure would be invisible until a client said
   * they never got it.
   */
  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: sent.ok
      ? contact.activatedAt
        ? 'client.sign_in.link_sent'
        : 'client.invite.sent'
      : 'client.invite.send_failed',
    entityType: 'ClientContact',
    entityId: contact.id,
    summary: sent.ok
      ? `Sent to ${contact.email}`
      : `Could not send to ${contact.email}: ${sent.error}`,
  });

  revalidatePath('/admin/clients');

  if (!sent.ok) {
    return { status: 'error', message: `The link was created but not sent: ${sent.error}` };
  }
  return { status: 'sent', message: `Sent to ${contact.email}.` };
}
