import 'server-only';
import { db } from '@/lib/db';
import { recordAudit } from './auth';
import { consoleEnv } from './env';
import { issueMagicToken, revokeMagicTokens } from './magic-link';
import { sendConsoleEmail } from './mailer';
import {
  clientInviteEmail,
  clientSignInEmail,
  colleagueInviteEmail,
  passwordChangedEmail,
  passwordResetEmail,
  signInEmailChangedEmail,
} from '@/lib/emails';
import { isUniqueConflict } from './conflict';

/**
 * People at a client: added by us from the console, or by a colleague from
 * the portal. Both go through here, so the checks and the invitation are
 * the same whoever does it.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type NewContact = {
  name: string;
  /** Null for someone we reach another way, who is sent a setup link by hand. */
  email: string | null;
  role: string | null;
  phone: string | null;
};

export function readContact(
  formData: FormData,
  { emailRequired = true }: { emailRequired?: boolean } = {},
): { ok: true; contact: NewContact } | { ok: false; message: string } {
  const text = (key: string, max: number) =>
    String(formData.get(key) ?? '')
      .trim()
      .slice(0, max);
  const name = text('name', 120);
  const email = text('email', 254).toLowerCase();
  if (name.length < 2) return { ok: false, message: 'Add their name.' };
  if (email ? !EMAIL.test(email) : emailRequired) {
    return { ok: false, message: 'Add a valid email address.' };
  }
  return {
    ok: true,
    contact: {
      name,
      email: email || null,
      role: text('role', 80) || null,
      phone: text('phone', 40) || null,
    },
  };
}

/**
 * Whether an address already belongs to someone at another client. One
 * address signs in to one account, so the same person cannot be added at two.
 */
export async function emailTakenElsewhere(email: string, clientId: string): Promise<boolean> {
  const taken = await db.clientContact.findFirst({
    where: { email, deletedAt: null, NOT: { clientId } },
    select: { id: true },
  });
  return taken !== null;
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

  const existing = contact.email
    ? await db.clientContact.findUnique({
        where: { clientId_email: { clientId: input.clientId, email: contact.email } },
        select: { id: true, deletedAt: true },
      })
    : null;
  if (existing && !existing.deletedAt) {
    return { ok: false, message: 'Someone with that email is already here.' };
  }
  if (contact.email && (await emailTakenElsewhere(contact.email, input.clientId))) {
    return {
      ok: false,
      message: 'Someone at another client already uses that email. One address signs in to one account.',
    };
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
    if (isUniqueConflict(error))
      return { ok: false, message: 'Someone with that email is already here.' };
    throw error;
  }

  await recordAudit({
    actorType: by.type,
    actorId: by.id,
    action: 'client.contact_added',
    entityType: 'ClientContact',
    entityId: person.id,
    summary: person.email ? `${person.name} (${person.email})` : person.name,
  });

  if (!person.email) {
    return {
      ok: true,
      message: `${person.name} added. Make them a setup link from their menu to send by hand.`,
    };
  }
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

/**
 * Corrects a person's details: a placeholder name, a missing email, a new job
 * title, or a new address for someone who has moved to one. For somebody set
 * up, the email is how they sign in, so the old address hears about the
 * change: if they did not ask for it, that note is how they find out.
 */
export async function updateContact(input: {
  contactId: string;
  clientId: string;
  name: string;
  email: string;
  role: string | null;
  phone: string | null;
  by: Actor;
}): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  const name = input.name.trim().slice(0, 120);
  const email = input.email.trim().toLowerCase().slice(0, 254);
  if (name.length < 2) return { ok: false, message: 'Add their name.' };
  if (email && !EMAIL.test(email)) return { ok: false, message: 'That email does not look right.' };

  const contact = await db.clientContact.findFirst({
    where: { id: input.contactId, clientId: input.clientId, deletedAt: null },
    select: { id: true, email: true, activatedAt: true },
  });
  if (!contact) return { ok: false, message: 'That person is no longer here.' };

  const emailChanged = (contact.email ?? '') !== email;
  if (emailChanged && !email && contact.email) {
    return { ok: false, message: 'Keep an email, or correct it.' };
  }
  if (emailChanged && email) {
    // One portal account per address, the same rule setup applies.
    const taken = await db.clientContact.findFirst({
      where: { email, deletedAt: null, NOT: { id: contact.id } },
      select: { id: true },
    });
    if (taken) return { ok: false, message: 'Someone else already uses that email.' };
  }

  try {
    await db.clientContact.update({
      where: { id: contact.id },
      data: { name, email: email || null, role: input.role, phone: input.phone },
    });
  } catch (error) {
    if (isUniqueConflict(error))
      return { ok: false, message: 'Someone else already uses that email.' };
    throw error;
  }

  // Links already emailed went to the old address; a wrong address is the
  // usual reason for changing it, so those links stop working. A setup link
  // shared by hand had no address behind it and keeps working.
  if (emailChanged && contact.email) {
    await revokeMagicTokens('client_contact', contact.id, [
      'invite',
      'sign_in',
      'password_reset',
    ]);
  }

  await recordAudit({
    actorType: input.by.type,
    actorId: input.by.id,
    action: 'client.contact_saved',
    entityType: 'ClientContact',
    entityId: contact.id,
    summary: emailChanged ? `${name}, email now ${email}` : name,
  });

  if (!emailChanged || !contact.email || !contact.activatedAt) {
    return { ok: true, message: 'Saved.' };
  }

  const noted = await sendConsoleEmail({
    to: contact.email,
    subject: 'Your portal sign-in email has changed',
    html: signInEmailChangedEmail({ name, newEmail: email }),
    template: 'sign_in_email_changed',
    entityType: 'ClientContact',
    entityId: contact.id,
  });
  await recordAudit({
    actorType: input.by.type,
    actorId: input.by.id,
    action: noted.ok ? 'client.email_change.noted' : 'client.email_change.note_failed',
    entityType: 'ClientContact',
    entityId: contact.id,
    summary: noted.ok
      ? `Told ${contact.email} it changed to ${email}`
      : `Could not tell ${contact.email}: ${noted.error}`,
  });
  return {
    ok: true,
    message: noted.ok
      ? `Saved. They sign in with ${email} now, and a note went to ${contact.email}.`
      : `Saved. They sign in with ${email} now. The note to ${contact.email} did not send: ${noted.error}`,
  };
}

/**
 * Emails a link to choose a new password, and logs whether it went. Callers
 * decide who may ask and how often.
 */
export async function sendPasswordLink(contact: { id: string; name: string; email: string }) {
  const { token } = await issueMagicToken({
    purpose: 'password_reset',
    actorType: 'client_contact',
    actorId: contact.id,
  });
  const sent = await sendConsoleEmail({
    to: contact.email,
    subject: 'Choose a new password for your Ubunifu portal',
    html: passwordResetEmail({
      name: contact.name,
      url: `${consoleEnv.publicOrigin}/portal/reset?token=${encodeURIComponent(token)}`,
    }),
    template: 'password_reset',
    entityType: 'ClientContact',
    entityId: contact.id,
  });
  await recordAudit({
    actorType: 'client_contact',
    actorId: contact.id,
    action: sent.ok ? 'client.password_reset.sent' : 'client.password_reset.send_failed',
    entityType: 'ClientContact',
    entityId: contact.id,
    summary: sent.ok ? undefined : sent.error,
  });
  return sent;
}

/**
 * Tells someone their password changed, at the address they sign in with. If
 * it was not them, this is how they find out.
 */
export async function notePasswordChanged(contact: {
  id: string;
  name: string;
  email: string | null;
}) {
  if (!contact.email) return;
  await sendConsoleEmail({
    to: contact.email,
    subject: 'Your portal password was changed',
    html: passwordChangedEmail({ name: contact.name, when: new Date() }),
    template: 'password_changed',
    entityType: 'ClientContact',
    entityId: contact.id,
  });
}

/** An invitation to set up an account, or a sign-in link for someone who has one. */
export async function invitePerson(input: {
  contact: { id: string; name: string; email: string | null; activatedAt: Date | null };
  clientName: string;
  by: Actor;
}) {
  const { contact, by } = input;
  if (!contact.email) {
    return {
      ok: false as const,
      error: `there is no email address for ${contact.name} yet. Share their setup link instead`,
    };
  }
  const { token } = await issueMagicToken({
    purpose: contact.activatedAt ? 'sign_in' : 'invite',
    actorType: 'client_contact',
    actorId: contact.id,
  });
  const url = `${consoleEnv.publicOrigin}/portal/sign-in/verify?token=${encodeURIComponent(token)}`;

  const fromColleague = by.type === 'client_contact';
  // Someone already set up gets a sign-in link, in the email that says so:
  // the invitation promises two weeks and a password to choose, and a
  // sign-in link lasts twenty minutes and needs neither.
  const sent = contact.activatedAt
    ? await sendConsoleEmail({
        to: contact.email,
        subject: 'Sign in to your Ubunifu portal',
        html: clientSignInEmail({ name: contact.name, url }),
        template: 'client_sign_in',
        entityType: 'ClientContact',
        entityId: contact.id,
      })
    : await sendConsoleEmail({
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
    action: contact.activatedAt
      ? sent.ok
        ? 'client.sign_in.link_sent'
        : 'client.sign_in.link_send_failed'
      : sent.ok
        ? 'client.invite.sent'
        : 'client.invite.send_failed',
    entityType: 'ClientContact',
    entityId: contact.id,
    summary: sent.ok
      ? `Sent to ${contact.email}`
      : `Could not send to ${contact.email}: ${sent.error}`,
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

/**
 * Brings back someone who was removed. Their portal access stays off, as it
 * does when a whole client comes back, until it is turned on for them. Not
 * when their address now belongs to someone at another client.
 */
export async function restoreContact(input: { contactId: string; clientId: string; by: Actor }) {
  const contact = await db.clientContact.findFirst({
    where: { id: input.contactId, clientId: input.clientId, deletedAt: { not: null } },
    select: { id: true, name: true, email: true },
  });
  if (!contact) return { ok: false as const, message: 'They are not removed.' };
  if (contact.email && (await emailTakenElsewhere(contact.email, input.clientId))) {
    return {
      ok: false as const,
      message: `${contact.email} now belongs to someone at another client, so ${contact.name} cannot come back with it.`,
    };
  }

  await db.clientContact.update({ where: { id: contact.id }, data: { deletedAt: null } });
  await recordAudit({
    actorType: input.by.type,
    actorId: input.by.id,
    action: 'client.contact_restored',
    entityType: 'ClientContact',
    entityId: contact.id,
    summary: contact.name,
  });
  return {
    ok: true as const,
    message: `${contact.name} is back. Turn on their portal access when they need it.`,
  };
}
