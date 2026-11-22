import 'server-only';
import { db } from '@/lib/db';
import { recordAudit } from '@/lib/console/auth';
import { invitePerson } from '@/lib/console/contacts';
import { createClientRecord } from '@/lib/console/onboarding';
import { currencyLabel } from '@/lib/console/currencies';
import { checkNewClient, type CheckedClient } from '@/lib/console/services/clients';
import { text, type ClientFacts, type PlanAction } from './types';

export const createClient: PlanAction<CheckedClient> = {
  name: 'create_client',
  label: 'Add client',
  description:
    'Add a new client organisation with the one person we deal with there. Use find_records first: never add a client that is already on the books. A project is a separate step.',
  permission: 'clients',
  properties: {
    name: { type: 'string', description: 'The organisation as it is known, such as "Usambara Destination Eco Tours".' },
    legal_name: { type: 'string', description: 'Registered name, only if it was given and differs.' },
    website: { type: 'string', description: 'Full address starting with https://' },
    country: { type: 'string', description: 'Two-letter country code, such as TZ.' },
    currency: { type: 'string', enum: ['TZS', 'USD', 'EUR', 'GBP', 'KES'], description: 'What they are billed in.' },
    notes: { type: 'string', description: 'Background the team should know. Only what you were told.' },
    contact_name: { type: 'string', description: 'The person we deal with.' },
    contact_email: { type: 'string', description: 'Their email. Leave out if not given.' },
    contact_role: { type: 'string', description: 'Their role there, such as Founder.' },
    contact_phone: { type: 'string', description: 'Their phone number, with country code.' },
  },
  required: ['name', 'country', 'currency', 'contact_name'],

  check: async (input) => {
    const checked = await checkNewClient({
      name: text(input.name),
      legalName: text(input.legal_name),
      website: text(input.website),
      country: text(input.country),
      currency: text(input.currency),
      notes: text(input.notes, 6000),
      contactName: text(input.contact_name),
      contactEmail: text(input.contact_email),
      contactRole: text(input.contact_role),
      contactPhone: text(input.contact_phone),
    });
    if (!checked.ok) return { ok: false, message: checked.message };
    const { client, contact } = checked.value;

    // The form lets two clients share a name, because two really can. The
    // assistant is refused, because for it a second one is far more likely a
    // record it failed to find than a namesake.
    const same = await db.client.findFirst({
      where: { name: { equals: client.name, mode: 'insensitive' }, deletedAt: null },
      select: { slug: true },
    });
    if (same) {
      return {
        ok: false,
        message: `A client called ${client.name} already exists (${same.slug}). Use it instead of adding another.`,
      };
    }

    return {
      ok: true,
      value: checked.value,
      subject: client.name,
      details: [
        `${client.country}, billed in ${currencyLabel(client.currency)}`,
        `Contact: ${contact.name}${contact.role ? `, ${contact.role}` : ''}`,
        ...(contact.email ? [contact.email] : ['No email yet']),
        ...(contact.phone ? [contact.phone] : []),
        ...(client.website ? [client.website] : []),
      ],
      produces: {
        client: {
          id: null,
          slug: null,
          name: client.name,
          currency: client.currency,
          contact: { id: null, name: contact.name, email: contact.email, activatedAt: null },
        },
      },
    };
  },

  run: async (value, env) => {
    const created = await createClientRecord({ ...value, staffId: env.staff.id });
    await recordAudit({
      actorType: 'staff',
      actorId: env.staff.id,
      action: 'client.created',
      entityType: 'Client',
      entityId: created.clientId,
      summary: value.client.name,
      metadata: { viaAssistant: true },
    });
    return {
      summary: `${value.client.name} added`,
      href: `/clients/${created.clientSlug}`,
      produces: {
        client: {
          id: created.clientId,
          slug: created.clientSlug,
          name: value.client.name,
          currency: value.client.currency,
          contact: {
            id: created.contactId,
            name: value.contact.name,
            email: value.contact.email,
            activatedAt: null,
          },
        },
      },
    };
  },
};

export const inviteContact: PlanAction<ClientFacts> = {
  name: 'invite_contact',
  label: 'Send portal invitation',
  description:
    'Email the client\'s main contact a link to set up their portal account. Only when the person asked for the invitation to be sent. It sends a real email once confirmed.',
  permission: 'clients',
  properties: {
    client: { type: 'string', description: 'The client: "step:N" for one added earlier in this plan, or its exact name.' },
  },
  required: ['client'],

  check: async (input, env) => {
    const client = await env.client(input.client);
    if (typeof client === 'string') return { ok: false, message: client };
    if (!client.contact) {
      return { ok: false, message: `${client.name} has no main contact to invite. Add one on their client page.` };
    }
    if (!client.contact.email) {
      return {
        ok: false,
        message: `There is no email address for ${client.contact.name}, so no invitation can be sent. Their setup link can be shared from the client page instead.`,
      };
    }
    return {
      ok: true,
      value: client,
      subject: client.contact.name,
      details: [client.name],
      sends: `Emails ${client.contact.email}`,
    };
  },

  run: async (client, env) => {
    const contact = client.contact!;
    const sent = await invitePerson({
      contact: { id: contact.id!, name: contact.name, email: contact.email, activatedAt: contact.activatedAt },
      clientName: client.name,
      by: { type: 'staff', id: env.staff.id, name: env.staff.name },
    });
    // With no email service, as on a laptop, the link is printed for whoever
    // is running the server. That is the invitation, as far as it can go there.
    if (!sent.ok && !sent.printed) {
      throw new StepRefused(`The invitation could not be sent: ${sent.error}.`);
    }
    return {
      summary: sent.ok ? `Invitation sent to ${contact.email}` : 'Invitation link printed in the server terminal',
      href: client.slug ? `/clients/${client.slug}` : undefined,
    };
  },
};

/** A step that could not be done, with words fit to show the person. */
export class StepRefused extends Error {}
