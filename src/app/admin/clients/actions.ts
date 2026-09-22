'use server';

import { NO_PERMISSION } from '@/lib/console/permissions';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { can, requireStaff } from '@/lib/console/auth';
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
