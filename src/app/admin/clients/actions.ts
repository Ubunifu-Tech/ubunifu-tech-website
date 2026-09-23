'use server';

import { NO_PERMISSION } from '@/lib/console/permissions';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { can, recordAudit, requireStaff } from '@/lib/console/auth';
import { consoleEnv } from '@/lib/console/env';
import { issueMagicToken, revokeMagicTokens } from '@/lib/console/magic-link';
import {
  addContact,
  invitePerson,
  makeMainContact,
  readContact,
  removeContact,
} from '@/lib/console/contacts';
import { allow } from '@/lib/console/rate-limit';
import { formText } from '@/lib/console/form';

export type InviteState = { status: 'idle' | 'sent' | 'done' | 'error'; message?: string };

/**
 * Staff-only, and requireStaff is called inside each action rather than relied
 * on from the page that rendered the form. A server action is a public
 * endpoint: anyone can post to it, whether or not they ever saw the page.
 */

async function clientFor(slugOrId: { id?: string; slug?: string }) {
  return db.client.findFirst({
    where: { ...(slugOrId.id ? { id: slugOrId.id } : { slug: slugOrId.slug }), deletedAt: null },
    select: { id: true, name: true, slug: true },
  });
}

/** Sends a client their invitation, or a sign-in link once they have an account. */
export async function inviteContact(
  _previous: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const staff = await requireStaff();
  if (!can(staff, 'clients')) return { status: 'error', message: NO_PERMISSION };

  const contact = await db.clientContact.findFirst({
    where: { id: formText(formData, 'contactId'), deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      canSignIn: true,
      activatedAt: true,
      client: { select: { name: true, slug: true, deletedAt: true } },
    },
  });

  if (!contact || contact.client.deletedAt) {
    return { status: 'error', message: 'That contact no longer exists.' };
  }
  if (!contact.canSignIn) {
    return { status: 'error', message: 'Portal access is turned off for this contact.' };
  }
  if (!(await allow('client-invite', contact.id, { limit: 5, windowMinutes: 60 }))) {
    return { status: 'error', message: 'Several links went out in the last hour. Try again later.' };
  }

  const sent = await invitePerson({
    contact,
    clientName: contact.client.name,
    by: { type: 'staff', id: staff.id, name: staff.name },
  });

  revalidatePath(`/admin/clients/${contact.client.slug}`);
  return sent.ok
    ? { status: 'sent', message: `Sent to ${contact.email}.` }
    : { status: 'error', message: `It did not send: ${sent.error}` };
}

export async function addClientContact(
  _previous: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const staff = await requireStaff();
  if (!can(staff, 'clients')) return { status: 'error', message: NO_PERMISSION };
  const client = await clientFor({ id: formText(formData, 'clientId') });
  if (!client) return { status: 'error', message: 'That client no longer exists.' };

  const read = readContact(formData);
  if (!read.ok) return { status: 'error', message: read.message };
  if (!(await allow('contact-add', staff.id, { limit: 40, windowMinutes: 24 * 60 }))) {
    return { status: 'error', message: 'That is a lot of new people for one day. Try again tomorrow.' };
  }

  const result = await addContact({
    clientId: client.id,
    clientName: client.name,
    contact: read.contact,
    by: { type: 'staff', id: staff.id, name: staff.name },
    invite: formData.get('invite') === 'on',
  });

  revalidatePath(`/admin/clients/${client.slug}`);
  return result.ok ? { status: 'done', message: result.message } : { status: 'error', message: result.message };
}

export async function setMainContact(
  _previous: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const staff = await requireStaff();
  if (!can(staff, 'clients')) return { status: 'error', message: NO_PERMISSION };
  const client = await clientFor({ id: formText(formData, 'clientId') });
  if (!client) return { status: 'error', message: 'That client no longer exists.' };

  const result = await makeMainContact({
    contactId: formText(formData, 'contactId'),
    clientId: client.id,
    by: { type: 'staff', id: staff.id, name: staff.name },
  });
  revalidatePath(`/admin/clients/${client.slug}`);
  return { status: result.ok ? 'done' : 'error', message: result.message };
}

export async function removeClientContact(
  _previous: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const staff = await requireStaff();
  if (!can(staff, 'clients')) return { status: 'error', message: NO_PERMISSION };
  const client = await clientFor({ id: formText(formData, 'clientId') });
  if (!client) return { status: 'error', message: 'That client no longer exists.' };

  const result = await removeContact({
    contactId: formText(formData, 'contactId'),
    clientId: client.id,
    by: { type: 'staff', id: staff.id, name: staff.name },
  });
  revalidatePath(`/admin/clients/${client.slug}`);
  return { status: result.ok ? 'done' : 'error', message: result.message };
}

export type SetupLinkState = {
  status: 'idle' | 'done' | 'error';
  message?: string;
  url?: string;
  /**
   * A WhatsApp chat to their number with the message written. Left out when
   * their number cannot be read with certainty, so the link never opens a
   * stranger's chat.
   */
  whatsapp?: string;
};

/**
 * A private link for somebody to set up their portal account themselves, for
 * sending by hand (WhatsApp, a text message) when their email address is not
 * known or not confirmed yet. It is the same one-time invitation the email
 * carries: it works once, lasts fourteen days, and asks them for their name,
 * email, phone and a password. Shown once here and never stored readable,
 * so a new one is made each time, and making one retires the earlier ones:
 * a link sent to a wrong number, or left in an old chat, stops working.
 */
export async function createSetupLink(
  _previous: SetupLinkState,
  formData: FormData,
): Promise<SetupLinkState> {
  const staff = await requireStaff();
  if (!can(staff, 'clients')) return { status: 'error', message: NO_PERMISSION };

  const contactId = formText(formData, 'contactId');
  const contact = await db.clientContact.findFirst({
    where: { id: contactId, deletedAt: null, client: { deletedAt: null } },
    select: {
      id: true,
      name: true,
      phone: true,
      canSignIn: true,
      activatedAt: true,
      client: { select: { name: true, slug: true, country: true } },
    },
  });
  if (!contact) return { status: 'error', message: 'They are not on this client any more.' };
  if (contact.activatedAt) {
    return { status: 'error', message: 'They have set up their account already.' };
  }
  if (!contact.canSignIn) {
    return { status: 'error', message: 'Portal access is turned off for this contact.' };
  }
  if (!(await allow('client-setup-link', contact.id, { limit: 10, windowMinutes: 60 }))) {
    return { status: 'error', message: 'Several links were made in the last hour. Try again later.' };
  }

  // Only the newest link works, including over an emailed invitation.
  await revokeMagicTokens('client_contact', contact.id, 'invite');
  const { token } = await issueMagicToken({
    purpose: 'invite',
    actorType: 'client_contact',
    actorId: contact.id,
  });
  const url = `${consoleEnv.publicOrigin}/portal/sign-in/verify?token=${encodeURIComponent(token)}`;

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'client.setup_link.created',
    entityType: 'ClientContact',
    entityId: contact.id,
    summary: `For ${contact.name}, to share by hand`,
  });

  const first = contact.name.split(' ')[0] ?? contact.name;
  const message =
    `Hello ${first}, this is Ubunifu Technologies. Here is your private link to set up ` +
    `the ${contact.client.name} project portal, where you can see the work, send us what we ` +
    `need and sign the agreement: ${url}\n\nIt works once and lasts 14 days. Please do not ` +
    `forward it.`;

  const number = whatsappNumber(contact.phone, contact.client.country);
  revalidatePath(`/admin/clients/${contact.client.slug}`);
  return {
    status: 'done',
    url,
    whatsapp: number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : undefined,
  };
}

/**
 * Calling codes for the countries whose local numbers we rewrite. Both write
 * a mobile as ten digits starting with 0 (0712 345 678), and so do Uganda and
 * Rwanda, so a local number is only rewritten when the client's own country
 * says which code it takes.
 */
const CALLING_CODE: Record<string, string> = { TZ: '255', KE: '254' };

/**
 * A number as wa.me wants it: digits only, with the country code. Returns ''
 * whenever the number cannot be read with certainty: a wrong guess would put
 * the private link in a stranger's chat.
 *
 * Accepted: a number written with its country code (+255 712 345 678, or
 * 00255...), and for a client in Tanzania or Kenya, a local number starting
 * with 0 or one already starting with that country's code.
 */
function whatsappNumber(phone: string | null, country: string): string {
  const written = (phone ?? '').trim();
  const digits = written.replace(/\D/g, '');
  if (!digits) return '';

  const international = written.startsWith('+')
    ? digits
    : digits.startsWith('00')
      ? digits.slice(2)
      : null;
  if (international !== null) {
    // E.164 allows up to 15 digits; anything under 8 is not a whole number.
    return /^[1-9]\d{7,14}$/.test(international) ? international : '';
  }

  const code = CALLING_CODE[country.trim().toUpperCase()];
  if (!code) return '';
  if (/^0[1-9]\d{8}$/.test(digits)) return `${code}${digits.slice(1)}`;
  if (digits.startsWith(code) && digits.length === code.length + 9) return digits;
  return '';
}
