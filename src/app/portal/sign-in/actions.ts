'use server';

import { redirect, unstable_rethrow } from 'next/navigation';
import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { consoleEnv } from '@/lib/console/env';
import { verifyPassword } from '@/lib/console/crypto';
import { issueMagicToken } from '@/lib/console/magic-link';
import { sendConsoleEmail } from '@/lib/console/mailer';
import { createSession } from '@/lib/console/session';
import {
  allow,
  clearFailedSignIns,
  isLocked,
  requestIp,
  recordFailedSignIn,
  tooManyLinkRequests,
} from '@/lib/console/rate-limit';
import { recordAudit } from '@/lib/console/auth';
import { clientSignInEmail } from '@/lib/emails';
import { sendPasswordLink, sendSetupLinkAgain } from '@/lib/console/contacts';
import { safePortalPath } from '@/lib/console/return-path';

export type PortalSignInState = {
  status: 'idle' | 'sent' | 'error';
  message?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Password sign-in.
 *
 * Every failure returns the same sentence. Distinguishing "no such account"
 * from "wrong password" tells an attacker which of your clients exist, and
 * distinguishing "locked" from "wrong password" tells them their guessing is
 * working. The audit log keeps the real reason.
 */
export async function signInWithPassword(
  previous: PortalSignInState,
  formData: FormData,
): Promise<PortalSignInState> {
  try {
    return await passwordSignIn(previous, formData);
  } catch (error) {
    // Signing in ends in a redirect, which Next throws; that must go through.
    unstable_rethrow(error);
    console.error('[portal] password sign-in failed', error);
    return { status: 'error', message: 'We could not sign you in just now. Please try again in a minute.' };
  }
}

async function passwordSignIn(
  _previous: PortalSignInState,
  formData: FormData,
): Promise<PortalSignInState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');

  const refused: PortalSignInState = {
    status: 'error',
    message: 'That email and password did not match. Try again, or use a sign-in link.',
  };

  if (!EMAIL_PATTERN.test(email) || !password) return refused;

  // Per address as well as per account: a script trying many accounts from
  // one machine is slowed before any single account's lock would notice.
  if (!(await allow('portal-password:ip', requestIp(await headers()), { limit: 30, windowMinutes: 15 }))) {
    return { status: 'error', message: 'Too many attempts from here. Wait a few minutes, or use a sign-in link.' };
  }

  const contact = await db.clientContact.findFirst({
    where: { email, deletedAt: null, canSignIn: true },
    select: {
      id: true,
      passwordHash: true,
      activatedAt: true,
      lockedUntil: true,
      client: { select: { deletedAt: true } },
    },
  });

  if (!contact || contact.client.deletedAt) {
    // Still spend time hashing, so a missing account does not answer faster
    // than a wrong password and become detectable by timing alone.
    await verifyPassword(password, 'scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA$AAAA');
    return refused;
  }

  if (isLocked(contact)) {
    await recordAudit({
      actorType: 'client_contact',
      actorId: contact.id,
      action: 'client.sign_in.locked',
      entityType: 'ClientContact',
      entityId: contact.id,
    });
    return refused;
  }

  if (!contact.passwordHash || !contact.activatedAt) {
    // Invited but never activated. Saying so would confirm the address exists.
    return refused;
  }

  if (!(await verifyPassword(password, contact.passwordHash))) {
    await recordFailedSignIn(contact.id);
    await recordAudit({
      actorType: 'client_contact',
      actorId: contact.id,
      action: 'client.sign_in.failed',
      entityType: 'ClientContact',
      entityId: contact.id,
    });
    return refused;
  }

  await clearFailedSignIns(contact.id);
  await createSession({
    actorType: 'client_contact',
    actorId: contact.id,
    audience: 'portal',
  });
  await recordAudit({
    actorType: 'client_contact',
    actorId: contact.id,
    action: 'client.sign_in.success',
    entityType: 'ClientContact',
    entityId: contact.id,
  });

  redirect(safePortalPath(formData.get('next')) ?? '/portal');
}

/**
 * The passwordless route: a link that signs someone in without their
 * password. Forgetting the password has its own route below, because a
 * sign-in link alone leaves them unable to choose a new one.
 */
export async function requestPortalLink(
  previous: PortalSignInState,
  formData: FormData,
): Promise<PortalSignInState> {
  try {
    return await sendPortalLink(previous, formData);
  } catch (error) {
    console.error('[portal] sign-in link failed', error);
    return { status: 'error', message: 'The link could not be sent just now. Please try again in a minute.' };
  }
}

async function sendPortalLink(
  _previous: PortalSignInState,
  formData: FormData,
): Promise<PortalSignInState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();

  const sameForEveryone: PortalSignInState = {
    status: 'sent',
    message: 'If that address has a portal, a sign-in link is on its way.',
  };

  if (!EMAIL_PATTERN.test(email)) {
    return { status: 'error', message: 'Enter a valid email address.' };
  }
  if (!(await allow('portal-link:ip', requestIp(await headers()), { limit: 10, windowMinutes: 15 }))) {
    return sameForEveryone;
  }

  const contact = await db.clientContact.findFirst({
    where: { email, deletedAt: null, canSignIn: true },
    select: {
      id: true,
      name: true,
      email: true,
      client: { select: { deletedAt: true } },
    },
  });

  if (!contact || contact.client.deletedAt) return sameForEveryone;

  if (
    await tooManyLinkRequests({
      actorType: 'client_contact',
      actorId: contact.id,
      purpose: 'sign_in',
    })
  ) {
    await recordAudit({
      actorType: 'client_contact',
      actorId: contact.id,
      action: 'client.sign_in.throttled',
      entityType: 'ClientContact',
      entityId: contact.id,
    });
    return sameForEveryone;
  }

  // The page they were trying to reach travels inside the token, so the link
  // lands there. The verify route checks it again before using it.
  const next = safePortalPath(formData.get('next'));
  const { token } = await issueMagicToken({
    purpose: 'sign_in',
    actorType: 'client_contact',
    actorId: contact.id,
    ...(next ? { entityType: 'Path', entityId: next } : {}),
  });

  await sendConsoleEmail({
    // The address typed, which is the one this contact was found by.
    to: email,
    subject: 'Sign in to your Ubunifu portal',
    html: clientSignInEmail({
      name: contact.name,
      url: `${consoleEnv.publicOrigin}/portal/sign-in/verify?token=${encodeURIComponent(token)}`,
    }),
    template: 'client_sign_in',
    entityType: 'ClientContact',
    entityId: contact.id,
  });

  await recordAudit({
    actorType: 'client_contact',
    actorId: contact.id,
    action: 'client.sign_in.link_sent',
    entityType: 'ClientContact',
    entityId: contact.id,
  });

  return sameForEveryone;
}

/**
 * Emails a link to choose a new password. Like the sign-in link, the answer
 * is the same whether or not the address has an account, and the audit log
 * keeps what really happened.
 *
 * Only for someone who has set up their account. Somebody still to finish
 * setting up has no password to forget; their invitation, or a sign-in
 * link, takes them to setup instead.
 */
export async function requestPasswordReset(
  previous: PortalSignInState,
  formData: FormData,
): Promise<PortalSignInState> {
  try {
    return await sendPasswordReset(previous, formData);
  } catch (error) {
    console.error('[portal] password reset link failed', error);
    return { status: 'error', message: 'The link could not be sent just now. Please try again in a minute.' };
  }
}

async function sendPasswordReset(
  _previous: PortalSignInState,
  formData: FormData,
): Promise<PortalSignInState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();

  const sameForEveryone: PortalSignInState = {
    status: 'sent',
    message: 'If that address has a portal account, a link to choose a new password is on its way.',
  };

  if (!EMAIL_PATTERN.test(email)) {
    return { status: 'error', message: 'Enter a valid email address.' };
  }
  if (!(await allow('portal-reset:ip', requestIp(await headers()), { limit: 10, windowMinutes: 15 }))) {
    return sameForEveryone;
  }

  const contact = await db.clientContact.findFirst({
    where: { email, deletedAt: null, canSignIn: true },
    select: {
      id: true,
      name: true,
      email: true,
      activatedAt: true,
      client: { select: { deletedAt: true, name: true } },
    },
  });

  if (!contact?.email || contact.client.deletedAt) return sameForEveryone;

  if (
    await tooManyLinkRequests({
      actorType: 'client_contact',
      actorId: contact.id,
      purpose: contact.activatedAt ? 'password_reset' : 'invite',
    })
  ) {
    await recordAudit({
      actorType: 'client_contact',
      actorId: contact.id,
      action: 'client.password_reset.throttled',
      entityType: 'ClientContact',
      entityId: contact.id,
    });
    return sameForEveryone;
  }

  if (!contact.activatedAt) {
    // Never set up, so there is no password to reset: the setup link again.
    await sendSetupLinkAgain({
      id: contact.id,
      name: contact.name,
      email: contact.email,
      clientName: contact.client.name,
    });
    return sameForEveryone;
  }

  await sendPasswordLink({ id: contact.id, name: contact.name, email: contact.email });
  return sameForEveryone;
}
