'use server';

import { NO_PERMISSION, STAFF_SIGNED_OUT } from '@/lib/console/permissions';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { openingStatus } from '@/lib/console/transitions';
import { readChosenFees } from '@/lib/console/plan-fees';
import { can, recordAudit, staffForAction } from '@/lib/console/auth';
import { consoleEnv } from '@/lib/console/env';
import { issueMagicToken } from '@/lib/console/magic-link';
import { sendConsoleEmail } from '@/lib/console/mailer';
import { clientInviteEmail } from '@/lib/emails';
import { createClientRecord } from '@/lib/console/onboarding';
import { formText } from '@/lib/console/form';
import { checkNewClient } from '@/lib/console/services/clients';
import { checkNewProject } from '@/lib/console/services/projects';

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
  ownerId: string;
};

export type NewClientState = {
  status: 'idle' | 'error';
  message?: string;
  /** Which field to point at, so the form can mark it rather than only warn. */
  field?: string;
  values?: NewClientValues;
  /** The session ended before the post arrived; the values come back to refill the form. */
  signedOut?: boolean;
};

/**
 * Creates a client by hand, with an optional first project and invitation.
 *
 * The staff check runs here rather than being inherited from the page: a
 * server action is a public endpoint, and the form having been rendered proves
 * nothing about who is posting to it. A lapsed session is answered with the
 * values rather than a redirect to sign-in, so fifteen typed fields survive it.
 */
export async function createClient(
  _previous: NewClientState,
  formData: FormData,
): Promise<NewClientState> {
  const values: NewClientValues = {
    name: formText(formData, 'name'),
    legalName: formText(formData, 'legalName'),
    website: formText(formData, 'website'),
    country: formText(formData, 'country'),
    currency: formText(formData, 'currency'),
    notes: formText(formData, 'notes').slice(0, 6000),
    contactName: formText(formData, 'contactName'),
    contactEmail: formText(formData, 'contactEmail'),
    contactRole: formText(formData, 'contactRole'),
    contactPhone: formText(formData, 'contactPhone'),
    sendInvite: formData.get('sendInvite') === 'on',
    startProject: formData.get('startProject') === 'on',
    projectName: formText(formData, 'projectName'),
    serviceLine: formText(formData, 'serviceLine'),
    engagementType: formText(formData, 'engagementType') || 'fixed_price_project',
    status: openingStatus(formData),
    templateId: formText(formData, 'templateId'),
    startDate: formText(formData, 'startDate'),
    targetDate: formText(formData, 'targetDate'),
    summary: formText(formData, 'summary'),
    ownerId: formText(formData, 'ownerId'),
  };

  const staff = await staffForAction();
  if (!staff) return { status: 'error', signedOut: true, message: STAFF_SIGNED_OUT, values };
  if (!can(staff, 'clients')) return { status: 'error', message: NO_PERMISSION };

  const fail = (message: string, field?: string): NewClientState => ({
    status: 'error',
    message,
    field,
    values,
  });

  const checkedClient = await checkNewClient(values);
  if (!checkedClient.ok) return fail(checkedClient.message, checkedClient.field);
  const { client, contact } = checkedClient.value;
  const { name, currency } = client;
  const { email } = contact;
  const contactName = contact.name;

  // ── The first project, if there is one yet ────────────────────────────
  let project: Parameters<typeof createClientRecord>[0]['project'];

  if (values.startProject && !can(staff, 'projects')) {
    return fail('Someone who runs projects needs to start the project. Turn the project off to add the client.');
  }

  if (values.startProject) {
    const checkedProject = await checkNewProject({ ...values, name: values.projectName });
    if (!checkedProject.ok) {
      // The same rules as the New project form, said for this one: here the
      // project is a section that can be turned off, and its name has its own field.
      return checkedProject.field === 'name'
        ? fail('Give the project a name, or turn the project section off.', 'projectName')
        : fail(checkedProject.message, checkedProject.field);
    }

    // The plan's fees as the form left them, priced in the client's currency.
    const chosenFees = readChosenFees(formData, currency);
    if ('error' in chosenFees) return fail(chosenFees.error);

    project = { ...checkedProject.value, fees: chosenFees.fees };
  }

  // ── Create ────────────────────────────────────────────────────────────
  let created;
  try {
    created = await createClientRecord({
      client,
      contact,
      project,
      enquiryId: formText(formData, 'enquiryId') || null,
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
    summary: created.reference ? `${name}, ${created.reference}` : name,
    metadata: { manual: true, projectId: created.projectId },
  });

  // ── Invitation ────────────────────────────────────────────────────────
  let inviteFailed = false;
  if (values.sendInvite && email) {
    const { token } = await issueMagicToken({
      purpose: 'invite',
      actorType: 'client_contact',
      actorId: created.contactId,
    });

    const sent = await sendConsoleEmail({
      to: email,
      subject: 'Your Ubunifu project portal is ready',
      html: clientInviteEmail({
        name: contactName,
        clientName: name,
        url: `${consoleEnv.portalOrigin}/sign-in/verify?token=${encodeURIComponent(token)}`,
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
    inviteFailed = !sent.ok;
  }

  revalidatePath('/admin', 'layout');
  // Two different paths on purpose. The cache is keyed by the internal route,
  // /admin/clients, but the browser is on admin.ubunifutech.com/clients: the
  // /admin prefix only exists after the rewrite, so a redirect written with it
  // would 404 on the public host. It opens the project when one was made, and
  // the client page when the invitation needs sending again, which is done there.
  if (inviteFailed) redirect(`/clients/${created.clientSlug}?invite=failed`);
  redirect(created.projectSlug ? `/projects/${created.projectSlug}` : `/clients/${created.clientSlug}`);
}
