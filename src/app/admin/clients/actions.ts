'use server';

import { NO_PERMISSION } from '@/lib/console/permissions';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { can, recordAudit, requireStaff } from '@/lib/console/auth';
import { consoleEnv } from '@/lib/console/env';
import {
  issueMagicToken,
  revokeEveryMagicToken,
  revokeMagicTokens,
} from '@/lib/console/magic-link';
import { revokeAllSessions, revokeSessionsFor } from '@/lib/console/session';
import { namesMatch, type RemovalState } from '@/lib/console/confirm-name';
import { withdrawOpenSignatures } from '@/lib/console/removal';
import {
  addContact,
  invitePerson,
  makeMainContact,
  readContact,
  removeContact,
  updateContact,
} from '@/lib/console/contacts';
import { allow } from '@/lib/console/rate-limit';
import { formText } from '@/lib/console/form';
import { whatsappNumber } from '@/lib/console/whatsapp';

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
    return {
      status: 'error',
      message: 'Several links went out in the last hour. Try again later.',
    };
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
    return {
      status: 'error',
      message: 'That is a lot of new people for one day. Try again tomorrow.',
    };
  }

  const result = await addContact({
    clientId: client.id,
    clientName: client.name,
    contact: read.contact,
    by: { type: 'staff', id: staff.id, name: staff.name },
    invite: formData.get('invite') === 'on',
  });

  revalidatePath(`/admin/clients/${client.slug}`);
  return result.ok
    ? { status: 'done', message: result.message }
    : { status: 'error', message: result.message };
}

/** Corrects a contact's name, email, job title or phone. */
export async function saveClientContact(
  _previous: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const staff = await requireStaff();
  if (!can(staff, 'clients')) return { status: 'error', message: NO_PERMISSION };
  const client = await clientFor({ id: formText(formData, 'clientId') });
  if (!client) return { status: 'error', message: 'That client no longer exists.' };

  const optional = (key: string, max: number) => formText(formData, key).slice(0, max) || null;
  const result = await updateContact({
    contactId: formText(formData, 'contactId'),
    clientId: client.id,
    name: formText(formData, 'name'),
    email: formText(formData, 'email'),
    role: optional('role', 80),
    phone: optional('phone', 40),
    by: { type: 'staff', id: staff.id, name: staff.name },
  });

  revalidatePath(`/admin/clients/${client.slug}`);
  revalidatePath('/admin/projects', 'layout');
  return result.ok
    ? { status: 'done', message: result.message }
    : { status: 'error', message: result.message };
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
 * so a new one is made each time, and making one retires the earlier ones
 * and ends any setup they opened: a link sent to a wrong number, or left in
 * an old chat, stops working even if it was already opened.
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
    return {
      status: 'error',
      message: 'Several links were made in the last hour. Try again later.',
    };
  }

  // Only the newest link works, including over an emailed invitation. They
  // have not finished setup, so every session they hold was opened from an
  // earlier link; ending those stops a link that was opened and left (or
  // opened by whoever it reached by mistake) from finishing setup later.
  await revokeMagicTokens('client_contact', contact.id, ['invite', 'sign_in']);
  await revokeAllSessions('client_contact', contact.id);
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
 * Removes a client: the client, every project and every person, in one
 * transaction, so there is never a moment where the client is gone and its
 * people can still sign in, or its projects still sit on the board.
 *
 * Nothing is deleted. deletedAt hides the rows, and invoices, payments,
 * signatures and the activity record stay exactly as they were. What is in
 * motion stops: documents out for signature are withdrawn, and every sign-in
 * link and portal session the people held is ended.
 */
export async function removeClient(
  _previous: RemovalState,
  formData: FormData,
): Promise<RemovalState> {
  const staff = await requireStaff();
  if (!can(staff, 'clients')) return { status: 'error', message: NO_PERMISSION };

  const client = await clientFor({ id: formText(formData, 'clientId') });
  if (!client) return { status: 'error', message: 'That client no longer exists.' };
  if (!namesMatch(formText(formData, 'confirmName'), client.name)) {
    return { status: 'error', message: `Type ${client.name} to confirm.` };
  }

  const removed = await db.$transaction(async (tx) => {
    const now = new Date();

    // Conditional, so two people removing the same client at once cannot
    // both go on to record it.
    const claimed = await tx.client.updateMany({
      where: { id: client.id, deletedAt: null },
      data: { deletedAt: now },
    });
    if (claimed.count === 0) return null;

    const projects = await tx.project.findMany({
      where: { clientId: client.id, deletedAt: null },
      select: { id: true },
    });
    const projectIds = projects.map((project) => project.id);
    if (projectIds.length > 0) {
      await tx.project.updateMany({
        where: { id: { in: projectIds } },
        data: { deletedAt: now },
      });
    }

    // Everyone, including people removed earlier: their old links and
    // sessions end too, which costs nothing and leaves nothing behind.
    const contacts = await tx.clientContact.findMany({
      where: { clientId: client.id },
      select: { id: true, deletedAt: true, canSignIn: true },
    });
    const contactIds = contacts.map((contact) => contact.id);
    const people = contacts.filter((contact) => !contact.deletedAt && contact.canSignIn).length;
    await tx.clientContact.updateMany({
      where: { clientId: client.id, deletedAt: null },
      data: { deletedAt: now, canSignIn: false },
    });
    await tx.clientContact.updateMany({
      where: { clientId: client.id, canSignIn: true },
      data: { canSignIn: false },
    });

    const withdrawn = await withdrawOpenSignatures(tx, projectIds);
    const links = await revokeEveryMagicToken(tx, 'client_contact', contactIds);
    const sessions = await revokeSessionsFor(tx, 'client_contact', contactIds);

    return { projectIds, people, withdrawn, links, sessions };
  });

  if (!removed) return { status: 'error', message: 'That client no longer exists.' };

  const projectCount = removed.projectIds.length;
  const documentCount = removed.withdrawn.length;
  const said = [
    projectCount === 0
      ? client.name
      : `${client.name} and ${projectCount === 1 ? 'its project' : `its ${projectCount} projects`}`,
    removed.people > 0
      ? `${removed.people} ${removed.people === 1 ? 'person' : 'people'} lost portal access`
      : null,
    documentCount > 0
      ? `${documentCount} ${documentCount === 1 ? 'document' : 'documents'} withdrawn`
      : null,
  ].filter(Boolean);
  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'client.removed',
    entityType: 'Client',
    entityId: client.id,
    summary: said.join('; '),
    metadata: {
      projectIds: removed.projectIds,
      withdrawnDocumentIds: removed.withdrawn.map((document) => document.id),
      linksRevoked: removed.links,
      sessionsEnded: removed.sessions,
    },
  });
  for (const document of removed.withdrawn) {
    await recordAudit({
      actorType: 'staff',
      actorId: staff.id,
      action: 'document.withdrawn',
      entityType: 'Document',
      entityId: document.id,
      summary: `${document.reference}, because ${client.name} was removed`,
    });
  }

  // Every list, count and figure in the console, and the portal those people
  // were using.
  revalidatePath('/admin', 'layout');
  revalidatePath('/portal', 'layout');
  redirect('/clients');
}

/**
 * Brings back a removed client, with the projects and people removed along
 * with it (they share its removal time; anything removed separately before
 * stays removed). Portal access stays off for everyone: coming back to the
 * books is not the same as being let back in, so staff turn it on person by
 * person. Somebody whose address now belongs to a person at another client
 * stays removed, because one address signs in to one account.
 */
export async function restoreClient(
  _previous: RemovalState,
  formData: FormData,
): Promise<RemovalState> {
  const staff = await requireStaff();
  if (!can(staff, 'clients')) return { status: 'error', message: NO_PERMISSION };

  const client = await db.client.findFirst({
    where: { id: formText(formData, 'clientId'), deletedAt: { not: null } },
    select: { id: true, name: true, slug: true, deletedAt: true },
  });
  if (!client?.deletedAt) return { status: 'error', message: 'That client is not removed.' };
  const removedAt = client.deletedAt;

  const restored = await db.$transaction(async (tx) => {
    const claimed = await tx.client.updateMany({
      where: { id: client.id, deletedAt: removedAt },
      data: { deletedAt: null },
    });
    if (claimed.count === 0) return null;

    const projects = await tx.project.updateMany({
      where: { clientId: client.id, deletedAt: removedAt },
      data: { deletedAt: null },
    });

    const people = await tx.clientContact.findMany({
      where: { clientId: client.id, deletedAt: removedAt },
      select: { id: true, name: true, email: true },
    });
    const back: string[] = [];
    const kept: string[] = [];
    for (const person of people) {
      const taken = person.email
        ? await tx.clientContact.findFirst({
            where: { email: person.email, deletedAt: null, NOT: { id: person.id } },
            select: { id: true },
          })
        : null;
      if (taken) {
        kept.push(person.name);
        continue;
      }
      await tx.clientContact.update({ where: { id: person.id }, data: { deletedAt: null } });
      back.push(person.name);
    }
    return { projects: projects.count, back, kept };
  });
  if (!restored) return { status: 'error', message: 'That client is not removed.' };

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'client.restored',
    entityType: 'Client',
    entityId: client.id,
    summary: [
      client.name,
      `${restored.projects} ${restored.projects === 1 ? 'project' : 'projects'}`,
      `${restored.back.length} ${restored.back.length === 1 ? 'person' : 'people'}, portal access off`,
      restored.kept.length > 0
        ? `not brought back, as their email is in use elsewhere: ${restored.kept.join(', ')}`
        : null,
    ]
      .filter(Boolean)
      .join('; '),
  });

  revalidatePath('/admin', 'layout');
  redirect(`/clients/${client.slug}?restored=1`);
}

/**
 * Turns someone's portal access on or off without removing them. Off ends
 * their sessions and unused links at once, for a lost phone or a person who
 * has left; on lets them in again, after which a sign-in link or an
 * invitation can be sent from the same menu.
 */
export async function setPortalAccess(
  _previous: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const staff = await requireStaff();
  if (!can(staff, 'clients')) return { status: 'error', message: NO_PERMISSION };
  const client = await clientFor({ id: formText(formData, 'clientId') });
  if (!client) return { status: 'error', message: 'That client no longer exists.' };

  const on = formText(formData, 'access') === 'on';
  const contact = await db.clientContact.findFirst({
    where: { id: formText(formData, 'contactId'), clientId: client.id, deletedAt: null },
    select: { id: true, name: true, canSignIn: true },
  });
  if (!contact) return { status: 'error', message: 'They are not on this client any more.' };
  if (contact.canSignIn === on) return { status: 'done' };

  await db.clientContact.update({ where: { id: contact.id }, data: { canSignIn: on } });
  if (!on) {
    await revokeMagicTokens('client_contact', contact.id, [
      'invite',
      'sign_in',
      'password_reset',
      'shared_link',
    ]);
    await revokeAllSessions('client_contact', contact.id);
  }
  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: on ? 'client.contact_access_on' : 'client.contact_access_off',
    entityType: 'ClientContact',
    entityId: contact.id,
    summary: contact.name,
  });

  revalidatePath(`/admin/clients/${client.slug}`);
  return {
    status: 'done',
    message: on
      ? `${contact.name} can use the portal again.`
      : `${contact.name} is signed out and cannot use the portal.`,
  };
}
