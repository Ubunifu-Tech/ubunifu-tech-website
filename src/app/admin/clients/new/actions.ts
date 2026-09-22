'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import {
  EngagementType,
  ProjectStatus,
  ServiceLine,
} from '@/generated/prisma/client';
import { requireStaff, recordAudit } from '@/lib/console/auth';
import { consoleEnv } from '@/lib/console/env';
import { issueMagicToken } from '@/lib/console/magic-link';
import { sendConsoleEmail } from '@/lib/console/mailer';
import { clientInviteEmail } from '@/lib/emails';
import { createClientRecord } from '@/lib/console/onboarding';
import { parseDateInput } from '@/lib/console/money';

/**
 * Everything the form posted, handed back on failure.
 *
 * React resets an uncontrolled form once its action returns, so without this a
 * single bad date would wipe fifteen fields somebody had just typed. The form
 * feeds these values back in as defaults, which makes the reset invisible.
 * Nothing secret passes through here — this form has no password on it.
 */
export type NewClientValues = {
  name: string;
  legalName: string;
  website: string;
  country: string;
  currency: string;
  notes: string;
  contactName: string;
  contactEmail: string;
  contactRole: string;
  contactPhone: string;
  sendInvite: boolean;
  startProject: boolean;
  projectName: string;
  serviceLine: string;
  engagementType: string;
  status: string;
  templateId: string;
  startDate: string;
  targetDate: string;
  summary: string;
};

export type NewClientState = {
  status: 'idle' | 'error';
  message?: string;
  /** Which field to point at, so the form can mark it rather than only warn. */
  field?: string;
  values?: NewClientValues;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CURRENCIES = ['USD', 'TZS', 'EUR', 'GBP', 'KES'] as const;

/**
 * Statuses a project can be created in.
 *
 * Deliberately short. Everything past a signed contract is reached by moving
 * the project through its state machine, where each transition is recorded and
 * the money-dependent ones are checked. Letting the create form drop a project
 * straight into `launched` would leave a project with no history of how it got
 * there, which is the one thing the status events exist to prevent.
 */
const OPENING_STATUSES: ProjectStatus[] = [
  ProjectStatus.lead,
  ProjectStatus.proposal_draft,
  ProjectStatus.proposal_sent,
  ProjectStatus.proposal_accepted,
];

function isMember<T extends string>(values: readonly T[], value: string): value is T {
  return (values as readonly string[]).includes(value);
}

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim();
}

/**
 * Creates a client by hand, with an optional first project and invitation.
 *
 * requireStaff runs here rather than being inherited from the page: a server
 * action is a public endpoint, and the form having been rendered proves nothing
 * about who is posting to it.
 */
export async function createClient(
  _previous: NewClientState,
  formData: FormData,
): Promise<NewClientState> {
  const staff = await requireStaff();

  const values: NewClientValues = {
    name: text(formData, 'name'),
    legalName: text(formData, 'legalName'),
    website: text(formData, 'website'),
    country: text(formData, 'country'),
    currency: text(formData, 'currency'),
    notes: text(formData, 'notes'),
    contactName: text(formData, 'contactName'),
    contactEmail: text(formData, 'contactEmail'),
    contactRole: text(formData, 'contactRole'),
    contactPhone: text(formData, 'contactPhone'),
    sendInvite: formData.get('sendInvite') === 'on',
    startProject: formData.get('startProject') === 'on',
    projectName: text(formData, 'projectName'),
    serviceLine: text(formData, 'serviceLine'),
    engagementType: text(formData, 'engagementType'),
    status: text(formData, 'status'),
    templateId: text(formData, 'templateId'),
    startDate: text(formData, 'startDate'),
    targetDate: text(formData, 'targetDate'),
    summary: text(formData, 'summary'),
  };

  const fail = (message: string, field?: string): NewClientState => ({
    status: 'error',
    message,
    field,
    values,
  });

  // ── The organisation ──────────────────────────────────────────────────
  const { name } = values;
  if (name.length < 2 || name.length > 160) {
    return fail('Enter the organisation’s name.', 'name');
  }

  const country = values.country.toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) {
    return fail('Country should be a two-letter code, such as TZ.', 'country');
  }

  const currency = values.currency.toUpperCase();
  if (!isMember(CURRENCIES, currency)) {
    return fail('Choose a currency.', 'currency');
  }

  const { website } = values;
  if (website) {
    try {
      const parsed = new URL(website);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('scheme');
    } catch {
      return fail('The website should be a full address, starting with https://', 'website');
    }
  }

  // ── The person ────────────────────────────────────────────────────────
  const { contactName } = values;
  if (contactName.length < 2 || contactName.length > 120) {
    return fail('Enter the name of the person you deal with.', 'contactName');
  }

  const email = values.contactEmail.toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    return fail('Enter a valid email address for the contact.', 'contactEmail');
  }

  // ── The first project, if there is one yet ────────────────────────────
  const { startProject } = values;
  let project: Parameters<typeof createClientRecord>[0]['project'];

  if (startProject) {
    const { projectName } = values;
    if (projectName.length < 2 || projectName.length > 160) {
      return fail('Give the project a name, or turn the project section off.', 'projectName');
    }

    const { serviceLine } = values;
    if (!isMember(Object.values(ServiceLine), serviceLine)) {
      return fail('Choose a service line.', 'serviceLine');
    }

    const { engagementType } = values;
    if (!isMember(Object.values(EngagementType), engagementType)) {
      return fail('Choose how this work is billed.', 'engagementType');
    }

    const { status } = values;
    if (!isMember(OPENING_STATUSES, status)) {
      return fail('Choose where this project stands today.', 'status');
    }

    const { templateId } = values;
    if (templateId) {
      const template = await db.projectTemplate.findUnique({
        where: { id: templateId },
        select: { serviceLine: true },
      });
      if (!template) {
        return fail('That plan no longer exists. Pick another.', 'templateId');
      }
      if (template.serviceLine !== serviceLine) {
        return fail('That plan belongs to a different service line.', 'templateId');
      }
    }

    const startDate = parseDateInput(values.startDate);
    const targetDate = parseDateInput(values.targetDate);
    if (startDate && targetDate && targetDate < startDate) {
      return fail('The target date is before the start date.', 'targetDate');
    }

    project = {
      name: projectName,
      serviceLine,
      engagementType,
      status,
      templateId: templateId || null,
      summary: values.summary || null,
      startDate,
      targetDate,
    };
  }

  // ── Create ────────────────────────────────────────────────────────────
  let created;
  try {
    created = await createClientRecord({
      client: {
        name,
        legalName: values.legalName || null,
        country,
        currency,
        website: website || null,
        notes: values.notes || null,
      },
      contact: {
        name: contactName,
        email,
        role: values.contactRole || null,
        phone: values.contactPhone || null,
      },
      project,
      enquiryId: text(formData, 'enquiryId') || null,
      staffId: staff.id,
    });
  } catch (error) {
    // Two people creating a client in the same moment can collide on a project
    // reference. Reported plainly rather than swallowed, because retrying the
    // form is safe and takes a second.
    const code = (error as { code?: string }).code;
    if (code === 'P2002') {
      return fail('Something with that name or reference was just created. Try again.');
    }
    console.error('Client creation failed', error);
    return fail('The client could not be created. Nothing was saved.');
  }

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'client.created',
    entityType: 'Client',
    entityId: created.clientId,
    summary: created.reference ? `${name} — ${created.reference}` : name,
    metadata: { manual: true, projectId: created.projectId },
  });

  // ── Invitation ────────────────────────────────────────────────────────
  if (values.sendInvite) {
    const { token } = await issueMagicToken({
      purpose: 'sign_in',
      actorType: 'client_contact',
      actorId: created.contactId,
    });

    const sent = await sendConsoleEmail({
      to: email,
      subject: 'Your Ubunifu project portal is ready',
      html: clientInviteEmail({
        name: contactName,
        clientName: name,
        url: `${consoleEnv.publicOrigin}/portal/sign-in/verify?token=${encodeURIComponent(token)}`,
      }),
      template: 'client_invite',
      entityType: 'ClientContact',
      entityId: created.contactId,
    });

    // Derived from the outcome. This action redirects straight afterwards, so
    // the audit line is the only trace the person who clicked will ever see —
    // it has to say what really happened rather than what was attempted.
    await recordAudit({
      actorType: 'staff',
      actorId: staff.id,
      action: sent.ok ? 'client.invite.sent' : 'client.invite.send_failed',
      entityType: 'ClientContact',
      entityId: created.contactId,
      summary: sent.ok ? `Sent to ${email}` : `Could not send to ${email}: ${sent.error}`,
    });
  }

  revalidatePath('/admin/clients');
  revalidatePath('/admin/enquiries');
  // Two different paths on purpose. The cache is keyed by the internal route,
  // /admin/clients, but the browser is on admin.ubunifutech.com/clients — the
  // /admin prefix only exists after the rewrite. A redirect written with the
  // prefix would 404 on the public host.
  redirect('/clients');
}
