'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { getPendingContact, recordAudit } from '@/lib/console/auth';
import { hashPassword, passwordProblem } from '@/lib/console/crypto';
import { revokeMagicTokens } from '@/lib/console/magic-link';
import { EMAILED_LINKS } from '@/lib/console/client-links';
import { readSession, revokeAllSessions } from '@/lib/console/session';
import { safePortalPath } from '@/lib/console/return-path';
import { allow } from '@/lib/console/rate-limit';
import { SETUP_EMAIL_NOT_USABLE, sendSetupEmailConfirmation } from '@/lib/console/contacts';

export type ActivateState = { status: 'idle' | 'sent' | 'error'; message?: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Finishes account creation: confirm who you are, choose a password.
 *
 * Requires an existing portal session, which only the invitation link can have
 * produced. Without that check this action would let anyone with the contact's
 * id set their password.
 *
 * Someone setting up from a link shared by hand has no address on the account
 * yet, so they give one first and it is emailed a link. Opening that link is
 * what makes it the account's address (continueWithLink), and they choose a
 * password after. A typed address is never taken on trust: it becomes how they
 * sign in and what their signature is recorded against.
 */
export async function activateAccount(
  _previous: ActivateState,
  formData: FormData,
): Promise<ActivateState> {
  const actor = await getPendingContact();
  if (!actor) {
    return {
      status: 'error',
      message: 'Your link has expired. Ask us for a new one.',
    };
  }
  if (actor.isActivated) intoThePortal('/portal');

  const name = String(formData.get('name') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim().slice(0, 40);
  if (name.length < 2 || name.length > 120) {
    return { status: 'error', message: 'Enter the name you would like us to use.' };
  }
  if (!actor.email) {
    return confirmEmail({ id: actor.id, clientName: actor.clientName }, name, phone, formData);
  }

  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');
  const problem = passwordProblem(password);
  if (problem) return { status: 'error', message: problem };

  if (password !== confirm) {
    return { status: 'error', message: 'The two passwords do not match.' };
  }

  // Conditional on setup not being finished, so two tabs or two devices on
  // the same link cannot both choose the password.
  const { count: activated } = await db.clientContact.updateMany({
    where: { id: actor.id, activatedAt: null, deletedAt: null, canSignIn: true },
    data: {
      name,
      phone: phone || null,
      passwordHash: await hashPassword(password),
      passwordSetAt: new Date(),
      activatedAt: new Date(),
      failedSignIns: 0,
      lockedUntil: null,
    },
  });
  if (activated !== 1) {
    return {
      status: 'error',
      message: 'This account has already been set up. Sign in to continue.',
    };
  }

  // Every link emailed before setup is now spent: setup, invitation and
  // sign-in links, and document, invoice and password links too, as on a
  // reset or a password change. Any other session opened from one of them
  // ends here. Either would otherwise be a second way into an account that
  // now has a password. The session that finished setup is the one kept.
  await revokeMagicTokens('client_contact', actor.id, EMAILED_LINKS);
  const session = await readSession('portal');
  await revokeAllSessions('client_contact', actor.id, session?.sessionId);

  await recordAudit({
    actorType: 'client_contact',
    actorId: actor.id,
    action: 'client.account.activated',
    entityType: 'ClientContact',
    entityId: actor.id,
  });

  intoThePortal(safePortalPath(formData.get('next')) ?? '/portal');
}

/**
 * The first half of setup for someone with no address yet: their details are
 * saved, and the address they typed is sent a link to confirm it. The form
 * stays, so a typo can be fixed and sent again; the newer link replaces the
 * older one.
 */
async function confirmEmail(
  actor: { id: string; clientName: string },
  name: string,
  phone: string,
  formData: FormData,
): Promise<ActivateState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 254) {
    return { status: 'error', message: 'Enter the email address you would like to sign in with.' };
  }
  // Limited before the lookup, so addresses cannot be tried one after
  // another to see which are taken, and so the form cannot send a stream of
  // emails.
  if (!(await allow('portal-activate', actor.id, { limit: 5, windowMinutes: 15 }))) {
    return { status: 'error', message: 'Too many tries. Wait a few minutes.' };
  }
  // One portal account per address, so signing in is never ambiguous.
  // Removed contacts do not count: they can no longer sign in. One answer
  // whether it is held at another client or on this one, so the form cannot
  // be used to find out who our clients are. Checked again when the link is
  // opened, since someone else may take it in between.
  const taken = await db.clientContact.findFirst({
    where: { email, deletedAt: null, NOT: { id: actor.id } },
    select: { id: true },
  });
  if (taken) return { status: 'error', message: SETUP_EMAIL_NOT_USABLE };

  await db.clientContact.updateMany({
    where: { id: actor.id, email: null, activatedAt: null, deletedAt: null },
    data: { name, phone: phone || null },
  });
  const sent = await sendSetupEmailConfirmation({
    contactId: actor.id,
    name,
    clientName: actor.clientName,
    email,
  });
  return sent.ok
    ? { status: 'sent', message: `We sent a link to ${email}. Open it to finish setting up.` }
    : {
        status: 'error',
        message: 'That email could not be sent just now. Check the address and try again in a minute.',
      };
}

/**
 * Setup is shown without the portal bar, and a redirect on its own keeps the
 * layout the form was drawn in. Revalidating the portal layout first is what
 * brings the bar and the sections in on arrival.
 */
function intoThePortal(path: string): never {
  revalidatePath('/portal', 'layout');
  redirect(path);
}
