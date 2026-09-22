import 'server-only';
import { db } from '@/lib/db';
import { recordAudit } from './auth';
import { consoleEnv } from './env';
import { issueMagicToken } from './magic-link';
import { sendConsoleEmail } from './mailer';
import { clientInviteEmail, colleagueInviteEmail } from '@/lib/emails';
import { isUniqueConflict } from './conflict';

/**
 * People at a client: added by us from the console, or by a colleague from
 * the portal. Both go through here, so the checks and the invitation are
 * the same whoever does it.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type NewContact = {
  name: string;
  email: string;
  role: string | null;
  phone: string | null;
};

export function readContact(formData: FormData): { ok: true; contact: NewContact } | { ok: false; message: string } {
  const text = (key: string, max: number) => String(formData.get(key) ?? '').trim().slice(0, max);
  const name = text('name', 120);
  const email = text('email', 254).toLowerCase();
  if (name.length < 2) return { ok: false, message: 'Add their name.' };
  if (!EMAIL.test(email)) return { ok: false, message: 'Add a valid email address.' };
  return {
    ok: true,
    contact: {
      name,
      email,
      role: text('role', 80) || null,
      phone: text('phone', 40) || null,
    },
  };
}

type Actor =
  | { type: 'staff'; id: string; name: string }
  | { type: 'client_contact'; id: string; name: string };

/**
 * Adds a person, or brings back one who was removed, and sends them an
 * invitation. Returns what happened in words the caller can show.
 */
export async function addContact(input: {
  clientId: string;
  clientName: string;
  contact: NewContact;
  by: Actor;
  invite: boolean;
}): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  const { contact, by } = input;

  const existing = await db.clientContact.findUnique({
    where: { clientId_email: { clientId: input.clientId, email: contact.email } },
    select: { id: true, deletedAt: true },
  });
  if (existing && !existing.deletedAt) {
    return { ok: false, message: 'Someone with that email is already here.' };
  }

  let person;
  try {
  person = existing
    ? await db.clientContact.update({
        where: { id: existing.id },
        data: { ...contact, deletedAt: null, canSignIn: true },
        select: { id: true, name: true, email: true, activatedAt: true },
      })
    : await db.clientContact.create({
        data: { clientId: input.clientId, ...contact },
        select: { id: true, name: true, email: true, activatedAt: true },
      });
  } catch (error) {
    // Added by someone else in the same moment.
    if (isUniqueConflict(error)) return { ok: false, message: 'Someone with that email is already here.' };
    throw error;
  }

  await recordAudit({
    actorType: by.type,
    actorId: by.id,
    action: 'client.contact_added',
    entityType: 'ClientContact',
    entityId: person.id,
    summary: `${person.name} (${person.email})`,
  });

  if (!input.invite) return { ok: true, message: `${person.name} added.` };

  const sent = await invitePerson({
    contact: person,
    clientName: input.clientName,
    by,
  });
  if (sent.ok) return { ok: true, message: `${person.name} added and invited.` };
  // Staff can act on the mail service's reason; a client cannot.
  return {
    ok: true,
    message:
      by.type === 'staff'
        ? `${person.name} added, but the invitation did not send: ${sent.error}`
        : `${person.name} added, but the invitation did not send. Use Send invitation to try again.`,
  };
}

/** An invitation to set up an account, or a sign-in link for someone who has one. */
export async function invitePerson(input: {
  contact: { id: string; name: string; email: string; activatedAt: Date | null };
  clientName: string;
  by: Actor;
}) {
  const { contact, by } = input;
  const { token } = await issueMagicToken({
    purpose: contact.activatedAt ? 'sign_in' : 'invite',
    actorType: 'client_contact',
    actorId: contact.id,
  });
  const url = `${consoleEnv.publicOrigin}/portal/sign-in/verify?token=${encodeURIComponent(token)}`;

  const fromColleague = by.type === 'client_contact';
  const sent = await sendConsoleEmail({
    to: contact.email,
    subject: fromColleague
      ? `${by.name} invited you to the ${input.clientName} portal`
      : 'Your Ubunifu project portal is ready',
    html: fromColleague
      ? colleagueInviteEmail({
          name: contact.name,
          invitedBy: by.name,
          clientName: input.clientName,
          url,
        })
      : clientInviteEmail({ name: contact.name, clientName: input.clientName, url }),
    template: fromColleague ? 'colleague_invite' : 'client_invite',
    entityType: 'ClientContact',
    entityId: contact.id,
  });

  await recordAudit({
    actorType: by.type,
    actorId: by.id,
    action: sent.ok ? 'client.invite.sent' : 'client.invite.send_failed',
    entityType: 'ClientContact',
    entityId: contact.id,
    summary: sent.ok ? `Sent to ${contact.email}` : `Could not send to ${contact.email}: ${sent.error}`,
  });

  return sent;
}

/**
 * Takes someone out. Their history stays; their access ends on their next
 * request, because every request re-checks. The main contact cannot be
 * removed until someone else is made main contact, so a client is never left
 * without a person who signs.
 */
export async function removeContact(input: { contactId: string; clientId: string; by: Actor }) {
  const contact = await db.clientContact.findFirst({
    where: { id: input.contactId, clientId: input.clientId, deletedAt: null },
    select: { id: true, name: true, isPrimary: true },
  });
  if (!contact) return { ok: false as const, message: 'They are not on this account.' };
  if (contact.isPrimary) {
    return { ok: false as const, message: 'Make someone else the main contact first.' };
  }
  if (input.by.type === 'client_contact' && input.by.id === contact.id) {
    return { ok: false as const, message: 'You cannot remove yourself.' };
  }

  await db.clientContact.update({
    where: { id: contact.id },
    data: { deletedAt: new Date(), canSignIn: false },
  });
  await recordAudit({
    actorType: input.by.type,
    actorId: input.by.id,
    action: 'client.contact_removed',
    entityType: 'ClientContact',
    entityId: contact.id,
    summary: contact.name,
  });
  return { ok: true as const, message: `${contact.name} removed.` };
}

/** Makes someone the main contact: the person who signs and gets billing. */
export async function makeMainContact(input: { contactId: string; clientId: string; by: Actor }) {
  const contact = await db.clientContact.findFirst({
    where: { id: input.contactId, clientId: input.clientId, deletedAt: null },
    select: { id: true, name: true, isPrimary: true },
  });
  if (!contact) return { ok: false as const, message: 'They are not on this account.' };
  if (contact.isPrimary) return { ok: true as const, message: 'Already the main contact.' };

  // Locked on the client, so two people choosing at once cannot leave two
  // main contacts behind.
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Client" WHERE id = ${input.clientId} FOR UPDATE`;
    await tx.clientContact.updateMany({
      where: { clientId: input.clientId, isPrimary: true },
      data: { isPrimary: false },
    });
    await tx.clientContact.update({
      where: { id: contact.id },
      data: { isPrimary: true, canSignIn: true },
    });
  });
  await recordAudit({
    actorType: input.by.type,
    actorId: input.by.id,
    action: 'client.contact_made_main',
    entityType: 'ClientContact',
    entityId: contact.id,
    summary: contact.name,
  });
  return { ok: true as const, message: `${contact.name} is now the main contact.` };
}
