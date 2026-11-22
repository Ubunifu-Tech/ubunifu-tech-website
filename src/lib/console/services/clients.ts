import 'server-only';
import { db } from '@/lib/db';
import { isOneOf } from '@/lib/console/form';
import { CURRENCIES, type Currency } from '@/lib/console/currencies';

/**
 * The rules for a new client, in one place: the New client form and the
 * console assistant both check what they were given here, before
 * createClientRecord writes it.
 */

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A client as typed, every value a string. */
export type NewClientDraft = {
  name: string;
  legalName?: string;
  website?: string;
  country: string;
  currency: string;
  notes?: string;
  contactName: string;
  contactEmail?: string;
  contactRole?: string;
  contactPhone?: string;
};

export type NewClientField =
  | 'name'
  | 'country'
  | 'currency'
  | 'website'
  | 'contactName'
  | 'contactEmail';

export type CheckedClient = {
  client: {
    name: string;
    legalName: string | null;
    country: string;
    currency: Currency;
    website: string | null;
    notes: string | null;
  };
  contact: { name: string; email: string | null; role: string | null; phone: string | null };
};

export type ClientCheck =
  | { ok: true; value: CheckedClient }
  | { ok: false; message: string; field: NewClientField };

export async function checkNewClient(draft: NewClientDraft): Promise<ClientCheck> {
  const refuse = (message: string, field: NewClientField): ClientCheck => ({
    ok: false,
    message,
    field,
  });
  const text = (value: string | undefined) => (value ?? '').trim();

  // Someone working on their own is their own client: with no organisation
  // name, the contact's name is used.
  const contactName = text(draft.contactName);
  const name = text(draft.name) || contactName;
  if (name.length < 2 || name.length > 160) {
    return refuse('Add the organisation’s name, or the name of the person.', 'name');
  }

  const country = text(draft.country).toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) {
    return refuse('Country should be a two-letter code, such as TZ.', 'country');
  }

  const currency = text(draft.currency).toUpperCase();
  if (!isOneOf(CURRENCIES, currency)) return refuse('Choose a currency.', 'currency');

  const website = text(draft.website);
  if (website) {
    try {
      const parsed = new URL(website);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('scheme');
    } catch {
      return refuse('The website should be a full address, starting with https://', 'website');
    }
  }

  if (contactName.length < 2 || contactName.length > 120) {
    return refuse('Enter the name of the person you deal with.', 'contactName');
  }

  // Optional: somebody reached on WhatsApp may not have given one yet. They
  // add it themselves from the setup link shared from their client page.
  const email = text(draft.contactEmail).toLowerCase() || null;
  if (email && !EMAIL_PATTERN.test(email)) {
    return refuse(
      'That email address does not look right. Leave it empty if you do not have it yet.',
      'contactEmail',
    );
  }
  // One address signs in to one account, so it cannot already be someone's
  // at another client.
  if (email) {
    const taken = await db.clientContact.findFirst({
      where: { email, deletedAt: null },
      select: { client: { select: { name: true } } },
    });
    if (taken) return refuse(`That email is already in use at ${taken.client.name}.`, 'contactEmail');
  }

  return {
    ok: true,
    value: {
      client: {
        name,
        legalName: text(draft.legalName) || null,
        country,
        currency,
        website: website || null,
        notes: text(draft.notes).slice(0, 6000) || null,
      },
      contact: {
        name: contactName,
        email,
        role: text(draft.contactRole) || null,
        phone: text(draft.contactPhone) || null,
      },
    },
  };
}
