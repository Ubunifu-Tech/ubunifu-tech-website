'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireClient, recordAudit, type ClientActor } from '@/lib/console/auth';
import {
  addContact,
  invitePerson,
  makeMainContact,
  readContact,
  removeContact,
} from '@/lib/console/contacts';
import { hashPassword, passwordProblem, verifyPassword } from '@/lib/console/crypto';
import { revokeMagicTokens } from '@/lib/console/magic-link';
import { allow } from '@/lib/console/rate-limit';
import { formText } from '@/lib/console/form';

export type TeamState = { status: 'idle' | 'sent' | 'done' | 'error'; message?: string };

/**
 * A client managing their own people. Everything is scoped to the signed-in
 * contact's client: an id posted from the form is only ever looked up inside
 * it. Anyone can invite a colleague; only the main contact can remove people
 * or hand the main contact role on.
 */

const by = (actor: ClientActor) => ({ type: 'client_contact' as const, id: actor.id, name: actor.name });

async function isMain(actor: ClientActor) {
  const me = await db.clientContact.findUnique({ where: { id: actor.id }, select: { isPrimary: true } });
  return me?.isPrimary === true;
}

export async function inviteColleague(_previous: TeamState, formData: FormData): Promise<TeamState> {
  const actor = await requireClient();
  const read = readContact(formData);
  if (!read.ok) return { status: 'error', message: read.message };

  // Per client, so one account cannot be used to send invitations to strangers.
  if (!(await allow('colleague-invite', actor.clientId, { limit: 10, windowMinutes: 24 * 60 }))) {
    return { status: 'error', message: 'That is a lot of invitations for one day. Try again tomorrow.' };
  }

  const result = await addContact({
    clientId: actor.clientId,
    clientName: actor.clientName,
    contact: read.contact,
    by: by(actor),
    invite: true,
  });

  revalidatePath('/portal/team');
  return result.ok ? { status: 'done', message: result.message } : { status: 'error', message: result.message };
}

export async function resendColleagueInvite(_previous: TeamState, formData: FormData): Promise<TeamState> {
  const actor = await requireClient();
  const contact = await db.clientContact.findFirst({
    where: { id: formText(formData, 'contactId'), clientId: actor.clientId, deletedAt: null, canSignIn: true },
    select: { id: true, name: true, email: true, activatedAt: true },
  });
  if (!contact) return { status: 'error', message: 'They are not on your account.' };
  if (!(await allow('client-invite', contact.id, { limit: 3, windowMinutes: 60 }))) {
    return { status: 'error', message: 'A link went out recently. Give it a few minutes.' };
  }

  const sent = await invitePerson({ contact, clientName: actor.clientName, by: by(actor) });
  return sent.ok
    ? { status: 'sent', message: `Sent to ${contact.email}.` }
    : { status: 'error', message: 'It did not send. Try again later.' };
}

export async function removeColleague(_previous: TeamState, formData: FormData): Promise<TeamState> {
  const actor = await requireClient();
  if (!(await isMain(actor))) {
    return { status: 'error', message: 'Only your main contact can remove people.' };
  }
  const result = await removeContact({
    contactId: formText(formData, 'contactId'),
    clientId: actor.clientId,
    by: by(actor),
  });
  revalidatePath('/portal/team');
  return { status: result.ok ? 'done' : 'error', message: result.message };
}

export async function handOverMain(_previous: TeamState, formData: FormData): Promise<TeamState> {
  const actor = await requireClient();
  if (!(await isMain(actor))) {
    return { status: 'error', message: 'Only your main contact can change this.' };
  }
  const result = await makeMainContact({
    contactId: formText(formData, 'contactId'),
    clientId: actor.clientId,
    by: by(actor),
  });
  revalidatePath('/portal/team');
  return { status: result.ok ? 'done' : 'error', message: result.message };
}

export async function saveMyDetails(_previous: TeamState, formData: FormData): Promise<TeamState> {
  const actor = await requireClient();
  const name = formText(formData, 'name').slice(0, 120);
  if (name.length < 2) return { status: 'error', message: 'Add your name.' };

  await db.clientContact.update({
    where: { id: actor.id },
    data: {
      name,
      role: formText(formData, 'role').slice(0, 80) || null,
      phone: formText(formData, 'phone').slice(0, 40) || null,
    },
  });
  await recordAudit({
    actorType: 'client_contact',
    actorId: actor.id,
    action: 'client.profile_saved',
    entityType: 'ClientContact',
    entityId: actor.id,
    summary: name,
  });

  revalidatePath('/portal', 'layout');
  return { status: 'done', message: 'Saved.' };
}

export async function changePassword(_previous: TeamState, formData: FormData): Promise<TeamState> {
  const actor = await requireClient();
  const current = String(formData.get('current') ?? '');
  const next = String(formData.get('next') ?? '');

  if (!(await allow('password-change', actor.id, { limit: 5, windowMinutes: 15 }))) {
    return { status: 'error', message: 'Too many tries. Wait a few minutes.' };
  }

  const me = await db.clientContact.findUnique({ where: { id: actor.id }, select: { passwordHash: true } });
  if (!me?.passwordHash || !(await verifyPassword(current, me.passwordHash))) {
    return { status: 'error', message: 'Your current password is not right.' };
  }
  const problem = passwordProblem(next);
  if (problem) return { status: 'error', message: problem };

  await db.clientContact.update({
    where: { id: actor.id },
    data: { passwordHash: await hashPassword(next), passwordSetAt: new Date() },
  });
  // Old links stop working once the password changes.
  await revokeMagicTokens('client_contact', actor.id, 'sign_in');
  await recordAudit({
    actorType: 'client_contact',
    actorId: actor.id,
    action: 'client.password_changed',
    entityType: 'ClientContact',
    entityId: actor.id,
  });

  return { status: 'done', message: 'Password changed.' };
}
