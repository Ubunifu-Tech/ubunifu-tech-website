import 'server-only';
import { db } from '@/lib/db';
import { recordAudit } from './auth';
import { consoleEnv } from './env';
import {
  issueMagicToken,
  revokeEveryMagicToken,
  revokeMagicTokens,
  spendUnsentLink,
} from './magic-link';
import { revokeSessionsFor } from './session';
import { EMAILED_LINKS } from './client-links';
import { sendConsoleEmail } from './mailer';
import {
  clientInviteEmail,
  clientSignInEmail,
  colleagueInviteEmail,
  passwordChangedEmail,
  passwordResetEmail,
  setupEmailConfirmEmail,
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

/**
 * Of these people, the ones holding an invitation link that went out and
 * still works.
 */
export async function invitedAmong(contactIds: string[]): Promise<Set<string>> {
  if (contactIds.length === 0) return new Set();
  const sent = await db.magicToken.findMany({
    where: {
      purpose: 'invite',
      actorType: 'client_contact',
      actorId: { in: contactIds },
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    distinct: ['actorId'],
    select: { actorId: true },
  });
  return new Set(sent.map((token) => token.actorId));
}

/** Who signs for a client: its main contact. */
export async function mainContactOf(clientId: string): Promise<{ id: string; name: string } | null> {
  return db.clientContact.findFirst({
    where: { clientId, isPrimary: true, deletedAt: null },
    select: { id: true, name: true },
  });
}

type Actor =
  | { type: 'staff'; id: string; name: string }
  | { type: 'client_contact'; id: string; name: string };

/**
 * What a client is told when an address cannot be used. Staff are told it
 * belongs to someone else; a client is not, because that would confirm the
 * address is one of our clients, which the sign-in page never does.
 */
const EMAIL_NOT_USABLE = 'That email cannot be used here. Use a different one, or get in touch.';

/** The same answer on setup, whether the address is held elsewhere or on this account. */
export const SETUP_EMAIL_NOT_USABLE =
  'That email cannot be used for this account. Use a different one, or get in touch.';

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
  // Only the main contact removes people, so only they bring someone back.
  if (existing && by.type === 'client_contact') {
    const me = await db.clientContact.findUnique({ where: { id: by.id }, select: { isPrimary: true } });
    if (!me?.isPrimary) {
      return {
        ok: false,
        message: 'They were taken off your account. Your main contact can bring them back.',
      };
    }
  }
  if (contact.email && (await emailTakenElsewhere(contact.email, input.clientId))) {
    return {
      ok: false,
      message:
        by.type === 'staff'
          ? 'Someone at another client already uses that email. One address signs in to one account.'
          : EMAIL_NOT_USABLE,
    };
  }

  let person;
  try {
    // Someone brought back starts again from the invitation: whatever
    // password, link or session they had before being removed stays dead.
    person = existing
      ? await db.$transaction(async (tx) => {
          await revokeEveryMagicToken(tx, 'client_contact', [existing.id]);
          await revokeSessionsFor(tx, 'client_contact', [existing.id]);
          return tx.clientContact.update({
            where: { id: existing.id },
            data: {
              ...contact,
              deletedAt: null,
              canSignIn: true,
              activatedAt: null,
              passwordHash: null,
              passwordSetAt: null,
              failedSignIns: 0,
              lockedUntil: null,
            },
            select: { id: true, name: true, email: true, activatedAt: true },
          });
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
        : `${person.name} added, but the invitation did not send. Use Email the invitation to try again.`,
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
  const takenMessage =
    input.by.type === 'staff' ? 'Someone else already uses that email.' : EMAIL_NOT_USABLE;
  if (emailChanged && email) {
    // One portal account per address, the same rule setup applies.
    const taken = await db.clientContact.findFirst({
      where: { email, deletedAt: null, NOT: { id: contact.id } },
      select: { id: true },
    });
    if (taken) return { ok: false, message: takenMessage };
  }

  try {
    await db.clientContact.update({
      where: { id: contact.id },
      data: { name, email: email || null, role: input.role, phone: input.phone },
    });
  } catch (error) {
    if (isUniqueConflict(error)) return { ok: false, message: takenMessage };
    throw error;
  }

  // Links already emailed went to the old address, documents and invoices
  // included; a wrong address is the usual reason for changing it, so those
  // links stop working. A setup link shared by hand had no address behind it
  // and keeps working.
  if (emailChanged && contact.email) {
    await revokeMagicTokens('client_contact', contact.id, EMAILED_LINKS);
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
  if (!sent.ok && !sent.printed) await spendUnsentLink(token);
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
 * Someone who never finished setting up asked for a sign-in link, or to
 * reset a password they do not have. What they need is their setup link, so
 * that is what goes. The email answers what they asked for (`reason`), and
 * `summary` says it on the activity record. A page they were trying to reach
 * travels in the link, so setup ends there.
 */
export async function sendSetupLinkAgain(contact: {
  id: string;
  name: string;
  email: string;
  clientName: string;
  /** What they asked for: a sign-in link, or to choose a password. */
  reason: 'sign_in' | 'reset';
  summary: string;
  next?: string | null;
}) {
  const { token } = await issueMagicToken({
    purpose: 'invite',
    actorType: 'client_contact',
    actorId: contact.id,
    ...(contact.next ? { entityType: 'Path', entityId: contact.next } : {}),
  });
  const sent = await sendConsoleEmail({
    to: contact.email,
    subject: 'Finish setting up your Ubunifu portal',
    html: clientInviteEmail({
      name: contact.name,
      clientName: contact.clientName,
      url: `${consoleEnv.publicOrigin}/portal/sign-in/verify?token=${encodeURIComponent(token)}`,
      reason: contact.reason,
    }),
    // Still an invitation, so a failed one can be sent again from the
    // console like any other.
    template: 'client_invite',
    entityType: 'ClientContact',
    entityId: contact.id,
  });
  if (!sent.ok && !sent.printed) await spendUnsentLink(token);
  await recordAudit({
    actorType: 'client_contact',
    actorId: contact.id,
    action: sent.ok ? 'client.invite.sent' : 'client.invite.send_failed',
    entityType: 'ClientContact',
    entityId: contact.id,
    summary: sent.ok ? contact.summary : sent.error,
  });
  return sent;
}

/**
 * Someone setting up from a link shared by hand gives their address here. It
 * becomes the account's only when they open this link from that inbox, which
 * is how every other address on an account was proved. Only the newest link
 * counts: sending again, to fix a typo say, ends the one before.
 */
export async function sendSetupEmailConfirmation(input: {
  contactId: string;
  name: string;
  clientName: string;
  email: string;
}) {
  await db.magicToken.updateMany({
    where: {
      purpose: 'invite',
      actorType: 'client_contact',
      actorId: input.contactId,
      entityType: 'Email',
      usedAt: null,
    },
    data: { usedAt: new Date() },
  });
  // The address travels in the link rather than on the contact, so nothing
  // is written to the account until the link is opened.
  const { token } = await issueMagicToken({
    purpose: 'invite',
    actorType: 'client_contact',
    actorId: input.contactId,
    entityType: 'Email',
    entityId: input.email,
  });
  const sent = await sendConsoleEmail({
    to: input.email,
    subject: 'Confirm your email for the Ubunifu portal',
    html: setupEmailConfirmEmail({
      name: input.name,
      clientName: input.clientName,
      url: `${consoleEnv.publicOrigin}/portal/sign-in/verify?token=${encodeURIComponent(token)}`,
    }),
    template: 'setup_email_confirm',
    entityType: 'ClientContact',
    entityId: input.contactId,
  });
  await recordAudit({
    actorType: 'client_contact',
    actorId: input.contactId,
    action: sent.ok ? 'client.setup_email.sent' : 'client.setup_email.send_failed',
    entityType: 'ClientContact',
    entityId: input.contactId,
    summary: sent.ok ? `Sent to ${input.email}` : `Could not send to ${input.email}: ${sent.error}`,
  });
  return sent;
}

/**
 * Makes a confirmed address the account's, once its link has been opened.
 * Refused when someone else holds the address by now, or the account has an
 * address already or is set up.
 */
export async function claimConfirmedEmail(contactId: string, email: string): Promise<boolean> {
  const refused = async (summary: string) => {
    await recordAudit({
      actorType: 'client_contact',
      actorId: contactId,
      action: 'client.setup_email.refused',
      entityType: 'ClientContact',
      entityId: contactId,
      summary,
    });
    return false;
  };

  const taken = await db.clientContact.findFirst({
    where: { email, deletedAt: null, NOT: { id: contactId } },
    select: { id: true },
  });
  if (taken) return refused(`${email} belongs to someone else`);

  let claimed: number;
  try {
    const result = await db.clientContact.updateMany({
      where: { id: contactId, email: null, activatedAt: null, deletedAt: null },
      data: { email },
    });
    claimed = result.count;
  } catch (error) {
    // A removed contact on the same client still holds the address.
    if (!isUniqueConflict(error)) throw error;
    return refused(`${email} belongs to someone else`);
  }
  if (claimed !== 1) return refused(`${email} not saved: the account has an address already`);

  await recordAudit({
    actorType: 'client_contact',
    actorId: contactId,
    action: 'client.setup_email.confirmed',
    entityType: 'ClientContact',
    entityId: contactId,
    summary: email,
  });
  return true;
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
  if (!sent.ok && !sent.printed) await spendUnsentLink(token);

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
 * Takes someone out. Their history stays; their access ends at once, with
 * every session they hold and every link sent to them. The main contact
 * cannot be removed until someone else is made main contact, so a client is
 * never left without a person who signs.
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

  await db.$transaction(async (tx) => {
    await tx.clientContact.update({
      where: { id: contact.id },
      data: { deletedAt: new Date(), canSignIn: false },
    });
    await revokeEveryMagicToken(tx, 'client_contact', [contact.id]);
    await revokeSessionsFor(tx, 'client_contact', [contact.id]);
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
    select: { id: true, name: true, email: true, isPrimary: true, canSignIn: true },
  });
  if (!contact) return { ok: false as const, message: 'They are not on this account.' };
  if (contact.isPrimary) return { ok: true as const, message: 'Already the main contact.' };
  // Agreements and invoices go to the main contact by email.
  if (!contact.email) {
    return { ok: false as const, message: `Add ${contact.name}'s email first, so invoices can reach them.` };
  }
  // The main contact signs, so it has to be someone who can sign in. Turning
  // access back on is ours to decide, not a side effect of this.
  if (!contact.canSignIn) {
    return {
      ok: false as const,
      message:
        input.by.type === 'staff'
          ? `Turn on ${contact.name}'s portal access first.`
          : `${contact.name} cannot sign in at the moment. Ask us to turn their access back on.`,
    };
  }

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
      data: { isPrimary: true },
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
/**
 * Brings a removed person back, with their old address or a new one.
 *
 * A new address is for when the old one now belongs to someone at another
 * client. Their password and portal account are cleared, and every link and
 * session they held is ended: nobody has shown they control the new address,
 * so they set up again from an invitation sent to it.
 */
export async function restoreContact(input: {
  contactId: string;
  clientId: string;
  by: Actor;
  newEmail?: string;
}) {
  const contact = await db.clientContact.findFirst({
    where: { id: input.contactId, clientId: input.clientId, deletedAt: { not: null } },
    select: { id: true, name: true, email: true },
  });
  if (!contact) return { ok: false as const, message: 'They are not removed.' };

  const newEmail = (input.newEmail ?? '').trim().toLowerCase().slice(0, 254);
  if (newEmail && !EMAIL.test(newEmail)) {
    return { ok: false as const, message: 'That email does not look right.' };
  }
  const address = newEmail || contact.email;
  if (address && (await emailTakenElsewhere(address, input.clientId))) {
    return {
      ok: false as const,
      message: newEmail
        ? 'Someone at another client already uses that email.'
        : `${contact.email} now belongs to someone at another client, so ${contact.name} cannot come back with it. Bring them back with a new email.`,
    };
  }
  if (newEmail) {
    // Removed people count too: an address is held once per client.
    const clash = await db.clientContact.findFirst({
      where: { clientId: input.clientId, email: newEmail, NOT: { id: contact.id } },
      select: { id: true },
    });
    if (clash) {
      return { ok: false as const, message: 'Someone at this client already uses that email.' };
    }
  }

  const changed = Boolean(newEmail) && newEmail !== contact.email;
  try {
    await db.$transaction(async (tx) => {
      await tx.clientContact.update({
        where: { id: contact.id },
        data: {
          deletedAt: null,
          ...(changed
            ? {
                email: newEmail,
                passwordHash: null,
                passwordSetAt: null,
                activatedAt: null,
                failedSignIns: 0,
                lockedUntil: null,
              }
            : {}),
        },
      });
      if (changed) {
        await revokeEveryMagicToken(tx, 'client_contact', [contact.id]);
        await revokeSessionsFor(tx, 'client_contact', [contact.id]);
      }
    });
  } catch (error) {
    if (isUniqueConflict(error)) {
      return { ok: false as const, message: 'Someone else already uses that email.' };
    }
    throw error;
  }

  await recordAudit({
    actorType: input.by.type,
    actorId: input.by.id,
    action: 'client.contact_restored',
    entityType: 'ClientContact',
    entityId: contact.id,
    summary: changed ? `${contact.name}, with a new email` : contact.name,
  });
  return {
    ok: true as const,
    message: `${contact.name} is back. Turn on their portal access when they need it.`,
  };
}
