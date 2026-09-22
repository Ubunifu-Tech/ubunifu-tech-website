'use server';

import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { consoleEnv } from '@/lib/console/env';
import { verifyPassword } from '@/lib/console/crypto';
import { issueMagicToken } from '@/lib/console/magic-link';
import { sendConsoleEmail } from '@/lib/console/mailer';
import { createSession } from '@/lib/console/session';
import {
  clearFailedSignIns,
  isLocked,
  recordFailedSignIn,
  tooManyLinkRequests,
} from '@/lib/console/rate-limit';
import { recordAudit } from '@/lib/console/auth';
import { clientSignInEmail } from '@/lib/emails';

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

  redirect('/portal');
}

/**
 * The passwordless route, which doubles as password recovery. There is no
 * separate reset flow: a client who forgets their password asks for a link and
 * sets a new one from inside the portal.
 */
export async function requestPortalLink(
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

  const { token } = await issueMagicToken({
    purpose: 'sign_in',
    actorType: 'client_contact',
    actorId: contact.id,
  });

  await sendConsoleEmail({
    to: contact.email,
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
