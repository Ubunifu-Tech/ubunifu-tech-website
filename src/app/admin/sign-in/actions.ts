'use server';

import { db } from '@/lib/db';
import { consoleEnv } from '@/lib/console/env';
import { issueMagicToken } from '@/lib/console/magic-link';
import { sendConsoleEmail } from '@/lib/console/mailer';
import { tooManyLinkRequests } from '@/lib/console/rate-limit';
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

  const sameForEveryone: SignInState = {
    status: 'sent',
    message: 'If that address can access the console, a sign-in link is on its way.',
  };

  const allowed = consoleEnv.staffAllowlist.includes(email);
  const staff = await db.staffUser.findUnique({ where: { email } });

  if (!allowed || !staff || !staff.isActive) {
    await recordAudit({
      actorType: 'system',
      action: 'staff.sign_in.refused',
      entityType: 'StaffUser',
      entityId: staff?.id ?? email,
      summary: !allowed ? 'Address not on the staff allowlist' : 'No active staff account',
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

  await sendConsoleEmail({
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
    action: 'staff.sign_in.link_sent',
    entityType: 'StaffUser',
    entityId: staff.id,
  });

  return sameForEveryone;
}
