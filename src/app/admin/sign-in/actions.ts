'use server';

import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { consoleEnv, isStaffEmailAllowed } from '@/lib/console/env';
import { issueMagicToken } from '@/lib/console/magic-link';
import { sendConsoleEmail } from '@/lib/console/mailer';
import { allow, requestIp, tooManyLinkRequests } from '@/lib/console/rate-limit';
import { recordAudit } from '@/lib/console/auth';
import { staffSignInEmail } from '@/lib/emails';

export type SignInState = { status: 'idle' | 'sent' | 'error'; message?: string };

/**
 * Requests a staff sign-in link.
 *
 * The response is identical whether or not the address exists, is active, or is
 * on the allowlist. Anything else turns this form into a way to find out who
 * works here. The audit log records the attempt either way, so a refused
 * request is visible to us even though the sender learns nothing.
 */
export async function requestStaffLink(
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: 'error', message: 'Enter a valid email address.' };
  }

  try {
    return await sendStaffLink(email);
  } catch (error) {
    // A database or mail outage must not become an error page. The person
    // is told plainly, and the cause is in the server log.
    console.error('[console] sign-in link failed', error);
    return {
      status: 'error',
      message: 'The link could not be sent just now. Please try again in a minute.',
    };
  }
}

async function sendStaffLink(email: string): Promise<SignInState> {
  const sameForEveryone: SignInState = {
    status: 'sent',
    message: 'If that address can use the console, a link is on its way. Check your spam folder if it does not arrive.',
  };

  if (!(await allow('staff-link:ip', requestIp(await headers()), { limit: 10, windowMinutes: 15 }))) {
    return sameForEveryone;
  }

  const allowed = isStaffEmailAllowed(email);
  let staff = await db.staffUser.findUnique({ where: { email } });

  /**
   * Setting up the console is the company account's job and nobody else's.
   * The first time it asks for a link, it becomes the owner. Everyone else
   * can only sign in once an owner has added them on the Team page.
   */
  if (!staff && email === consoleEnv.ownerEmail) {
    staff = await db.staffUser.upsert({
      where: { email },
      update: {},
      create: { email, name: 'Ubunifu Technologies', role: 'owner' },
    });
    await recordAudit({
      actorType: 'system',
      action: 'staff.owner_created',
      entityType: 'StaffUser',
      entityId: staff.id,
      summary: email,
    });
  }

  if (!allowed || !staff || !staff.isActive) {
    await recordAudit({
      actorType: 'system',
      action: 'staff.sign_in.refused',
      entityType: 'StaffUser',
      entityId: staff?.id ?? email,
      summary: !staff
        ? 'Not added on the Team page'
        : !staff.isActive
          ? 'Removed from the team'
          : 'Address not allowed by CONSOLE_STAFF_EMAILS',
    });
    return sameForEveryone;
  }

  if (await tooManyLinkRequests({ actorType: 'staff', actorId: staff.id, purpose: 'sign_in' })) {
    await recordAudit({
      actorType: 'staff',
      actorId: staff.id,
      action: 'staff.sign_in.throttled',
      entityType: 'StaffUser',
      entityId: staff.id,
    });
    return sameForEveryone;
  }

  const { token } = await issueMagicToken({
    purpose: 'sign_in',
    actorType: 'staff',
    actorId: staff.id,
  });

  const url = `${consoleEnv.adminOrigin}/sign-in/verify?token=${encodeURIComponent(token)}`;

  const sent = await sendConsoleEmail({
    to: staff.email,
    subject: 'Sign in to the Ubunifu console',
    html: staffSignInEmail({ name: staff.name, url }),
    template: 'staff_sign_in',
    entityType: 'StaffUser',
    entityId: staff.id,
  });

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: sent.ok ? 'staff.sign_in.link_sent' : 'staff.sign_in.send_failed',
    entityType: 'StaffUser',
    entityId: staff.id,
    summary: sent.ok ? undefined : sent.error,
  });

  return sameForEveryone;
}
