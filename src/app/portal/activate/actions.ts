'use server';

import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getClientActor, recordAudit } from '@/lib/console/auth';
import { hashPassword, passwordProblem } from '@/lib/console/crypto';
import { revokeMagicTokens } from '@/lib/console/magic-link';

export type ActivateState = { status: 'idle' | 'error'; message?: string };

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
  const actor = await getClientActor();
  if (!actor) {
    return {
      status: 'error',
      message: 'Your link has expired. Ask us for a new one.',
    };
  }
  if (actor.isActivated) redirect('/portal');

  const name = String(formData.get('name') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');

  if (name.length < 2 || name.length > 120) {
    return { status: 'error', message: 'Enter the name you would like us to use.' };
  }

  const problem = passwordProblem(password);
  if (problem) return { status: 'error', message: problem };

  if (password !== confirm) {
    return { status: 'error', message: 'The two passwords do not match.' };
  }

  await db.clientContact.update({
    where: { id: actor.id },
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

  // Any other invitation links still outstanding are now spent. An invitation
  // that survives activation is a second way into an account with a password.
  await revokeMagicTokens('client_contact', actor.id, 'sign_in');

  await recordAudit({
    actorType: 'client_contact',
    actorId: actor.id,
    action: 'client.account.activated',
    entityType: 'ClientContact',
    entityId: actor.id,
  });

  redirect('/portal');
}
