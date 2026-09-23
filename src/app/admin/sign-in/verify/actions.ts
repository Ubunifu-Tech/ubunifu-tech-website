'use server';

import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { isAdminHost, isStaffEmailAllowed } from '@/lib/console/env';
import { consumeMagicToken } from '@/lib/console/magic-link';
import { createSession } from '@/lib/console/session';
import { recordAudit } from '@/lib/console/auth';

/**
 * Burns a staff sign-in link and starts a session.
 *
 * Reached from the Continue button on the link's page, never from the link
 * itself, so a mail scanner or a chat preview that fetches the URL cannot
 * spend it first. The protections that matter are that the token is
 * single-use, short-lived, and useless once consumed, so a link sitting in an
 * inbox or a proxy log cannot be replayed.
 */
export async function continueStaffLink(formData: FormData): Promise<void> {
  // Defence in depth. The proxy only rewrites this path on the admin host, but
  // a session must never be mintable from the public origin.
  if (!isAdminHost((await headers()).get('host'))) notFound();

  const token = String(formData.get('token') ?? '');
  if (!token) redirect('/sign-in?error=missing');

  // An invitation is a first sign-in with a longer life, so both are accepted.
  const claim = await consumeMagicToken(token, ['sign_in', 'invite']);
  if (!claim || claim.actorType !== 'staff') redirect('/sign-in?error=expired');

  const staff = await db.staffUser.findUnique({ where: { id: claim.actorId } });

  // Re-checked at the moment of use, not only when the link was sent. An
  // address removed from the allowlist in the meantime cannot still walk in.
  if (!staff || !staff.isActive || !isStaffEmailAllowed(staff.email)) {
    await recordAudit({
      actorType: 'system',
      action: 'staff.sign_in.rejected_at_use',
      entityType: 'StaffUser',
      entityId: claim.actorId,
      summary: 'Account inactive or no longer on the allowlist',
    });
    redirect('/sign-in?error=expired');
  }

  await createSession({ actorType: 'staff', actorId: staff.id, audience: 'admin' });
  await db.staffUser.update({
    where: { id: staff.id },
    data: { lastSeenAt: new Date() },
  });
  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'staff.sign_in.success',
    entityType: 'StaffUser',
    entityId: staff.id,
  });

  redirect('/');
}
