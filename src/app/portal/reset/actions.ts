'use server';

import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { recordAudit } from '@/lib/console/auth';
import { notePasswordChanged } from '@/lib/console/contacts';
import { hashPassword, passwordProblem } from '@/lib/console/crypto';
import { consumeMagicToken, revokeMagicTokens } from '@/lib/console/magic-link';
import { EMAILED_LINKS } from '@/lib/console/client-links';
import { createSession, revokeAllSessions } from '@/lib/console/session';

export type ResetState = {
  status: 'idle' | 'error';
  message?: string;
  /** The link is spent or too old, so the form is no use without a new one. */
  expired?: boolean;
};

/**
 * Saves a new password from a reset link, then signs them in.
 *
 * The password is checked before the link is used, so a password that is too
 * short costs a retry rather than the link. Once it is saved, every way in
 * that existed before ends: other sessions, and emailed links still unused,
 * documents and invoices included. Whoever held the old password or an old
 * link is out.
 */
export async function resetPassword(
  _previous: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const token = String(formData.get('token') ?? '');
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');

  const problem = passwordProblem(password);
  if (problem) return { status: 'error', message: problem };
  if (password !== confirm) {
    return { status: 'error', message: 'The two passwords do not match.' };
  }

  const expired: ResetState = {
    status: 'error',
    expired: true,
    message: 'This link has expired or was already used.',
  };

  const claim = token ? await consumeMagicToken(token, 'password_reset') : null;
  if (!claim || claim.actorType !== 'client_contact') return expired;

  // Re-checked at the moment of use, as a sign-in link is: access removed
  // after the link was sent must not come back through it.
  const saved = await db.clientContact.updateMany({
    where: {
      id: claim.actorId,
      deletedAt: null,
      canSignIn: true,
      activatedAt: { not: null },
      client: { deletedAt: null },
    },
    data: {
      passwordHash: await hashPassword(password),
      passwordSetAt: new Date(),
      failedSignIns: 0,
      lockedUntil: null,
      lastSeenAt: new Date(),
    },
  });
  if (saved.count !== 1) {
    await recordAudit({
      actorType: 'system',
      action: 'client.password_reset.refused',
      entityType: 'ClientContact',
      entityId: claim.actorId,
      summary: 'Contact removed or portal access revoked',
    });
    return expired;
  }

  await revokeMagicTokens('client_contact', claim.actorId, EMAILED_LINKS);
  await revokeAllSessions('client_contact', claim.actorId);
  await createSession({
    actorType: 'client_contact',
    actorId: claim.actorId,
    audience: 'portal',
  });
  await recordAudit({
    actorType: 'client_contact',
    actorId: claim.actorId,
    action: 'client.password_reset',
    entityType: 'ClientContact',
    entityId: claim.actorId,
  });

  const contact = await db.clientContact.findUnique({
    where: { id: claim.actorId },
    select: { id: true, name: true, email: true },
  });
  if (contact) await notePasswordChanged(contact);

  redirect('/portal');
}
