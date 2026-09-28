'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { getPendingContact, recordAudit } from '@/lib/console/auth';
import { isUniqueConflict } from '@/lib/console/conflict';
import { hashPassword, passwordProblem } from '@/lib/console/crypto';
import { revokeMagicTokens } from '@/lib/console/magic-link';
import { EMAILED_LINKS } from '@/lib/console/client-links';
import { readSession, revokeAllSessions } from '@/lib/console/session';
import { safePortalPath } from '@/lib/console/return-path';
import { allow } from '@/lib/console/rate-limit';

export type ActivateState = { status: 'idle' | 'error'; message?: string };

/**
 * One answer whether the address is held at another client or on this one,
 * so the setup form cannot be used to find out who our clients are.
 */
const EMAIL_NOT_USABLE =
  'That email cannot be used for this account. Use a different one, or get in touch.';

/**
 * Finishes account creation: confirm who you are, choose a password.
 *
 * Requires an existing portal session, which only the invitation link can have
 * produced. Without that check this action would let anyone with the contact's
 * id set their password.
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
  // Asked for only when the link was shared by hand, before we had it.
  const email = actor.email ?? String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');

  if (name.length < 2 || name.length > 120) {
    return { status: 'error', message: 'Enter the name you would like us to use.' };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return { status: 'error', message: 'Enter the email address you would like to sign in with.' };
  }
  if (!actor.email) {
    // Limited before the lookup, so addresses cannot be tried one after
    // another to see which are taken.
    if (!(await allow('portal-activate', actor.id, { limit: 5, windowMinutes: 15 }))) {
      return { status: 'error', message: 'Too many tries. Wait a few minutes.' };
    }
    // One portal account per address, so signing in is never ambiguous.
    // Removed contacts do not count: they can no longer sign in. A removed
    // contact on this same client still holds its address in the database,
    // which the update below reports as a conflict.
    const taken = await db.clientContact.findFirst({
      where: { email, deletedAt: null, NOT: { id: actor.id } },
      select: { id: true },
    });
    if (taken) return { status: 'error', message: EMAIL_NOT_USABLE };
  }

  const problem = passwordProblem(password);
  if (problem) return { status: 'error', message: problem };

  if (password !== confirm) {
    return { status: 'error', message: 'The two passwords do not match.' };
  }

  let activated: number;
  try {
    // Conditional on setup not being finished, so two tabs or two devices on
    // the same link cannot both choose the email and password.
    const result = await db.clientContact.updateMany({
      where: { id: actor.id, activatedAt: null, deletedAt: null, canSignIn: true },
      data: {
        name,
        email,
        phone: phone || null,
        passwordHash: await hashPassword(password),
        passwordSetAt: new Date(),
        activatedAt: new Date(),
        failedSignIns: 0,
        lockedUntil: null,
      },
    });
    activated = result.count;
  } catch (error) {
    if (!isUniqueConflict(error)) throw error;
    return { status: 'error', message: EMAIL_NOT_USABLE };
  }
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
 * Setup is shown without the portal bar, and a redirect on its own keeps the
 * layout the form was drawn in. Revalidating the portal layout first is what
 * brings the bar and the sections in on arrival.
 */
function intoThePortal(path: string): never {
  revalidatePath('/portal', 'layout');
  redirect(path);
}
