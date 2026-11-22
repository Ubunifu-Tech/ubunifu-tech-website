'use server';

import { NO_PERMISSION } from '@/lib/console/permissions';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { openingStatus } from '@/lib/console/transitions';
import { readChosenFees } from '@/lib/console/plan-fees';
import { can, requireStaff, recordAudit } from '@/lib/console/auth';
import { createProjectForClient } from '@/lib/console/onboarding';
import { formText } from '@/lib/console/form';
import { checkNewProject } from '@/lib/console/services/projects';
import { isCurrency } from '@/lib/console/currencies';

/** What was typed, sent back with a refusal so the form can put it back. */
export type NewProjectValues = {
  name: string;
  ownerId: string;
  startDate: string;
  targetDate: string;
  summary: string;
  status: string;
};

export type NewProjectState = {
  status: 'idle' | 'error';
  message?: string;
  field?: string;
  values?: NewProjectValues;
};

/**
 * Starts another project for a client already on the books.
 *
 * Nothing here asks about the client — they exist, and their country and
 * contacts already have answers. Asking again is how two records of the same
 * organisation end up disagreeing. Currency is the exception: it starts as the
 * client's, but a project can be billed in another, because a client who was
 * quoted in USD for a build may pay for local work in TZS.
 */
export async function createProject(
  _previous: NewProjectState,
  formData: FormData,
): Promise<NewProjectState> {
  const staff = await requireStaff();
  if (!can(staff, 'projects')) return { status: 'error', message: NO_PERMISSION };

  // React clears the form once the action returns, refused or not.
  const values: NewProjectValues = {
    name: formText(formData, 'name'),
    ownerId: formText(formData, 'ownerId'),
    startDate: formText(formData, 'startDate'),
    targetDate: formText(formData, 'targetDate'),
    summary: formText(formData, 'summary'),
    status: openingStatus(formData),
  };
  const fail = (message: string, field?: string): NewProjectState => ({
    status: 'error',
    message,
    field,
    values,
  });

  const clientId = formText(formData, 'clientId');
  const client = await db.client.findFirst({
    where: { id: clientId, deletedAt: null },
    select: { id: true, slug: true, name: true, currency: true },
  });
  if (!client) return fail('That client no longer exists.');

  const checked = await checkNewProject({
    ...values,
    serviceLine: formText(formData, 'serviceLine'),
    engagementType: formText(formData, 'engagementType'),
    templateId: formText(formData, 'templateId'),
  });
  if (!checked.ok) return fail(checked.message, checked.field);
  const project = checked.value;
  const { name } = project;

  // Absent only from a form posted without the field; the client's own
  // currency is what the field would have defaulted to.
  const currency = (formText(formData, 'currency') || client.currency).toUpperCase();
  if (!isCurrency(currency)) {
    return fail('Choose a currency.', 'currency');
  }

  // The plan's fees as the form left them, priced in this project's currency.
  const chosenFees = readChosenFees(formData, currency);
  if ('error' in chosenFees) return fail(chosenFees.error);

  let created;
  try {
    created = await createProjectForClient({
      clientId: client.id,
      ...project,
      fees: chosenFees.fees,
      currency,
      staffId: staff.id,
    });
  } catch (error) {
    // Two people creating a project in the same moment can collide on a
    // reference. Retrying the form is safe and takes a second.
    if ((error as { code?: string }).code === 'P2002') {
      return fail('Something with that name or reference was just created. Try again.');
    }
    console.error('Project creation failed', error);
    return fail('The project could not be created. Nothing was saved.');
  }

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'project.created',
    entityType: 'Project',
    entityId: created.projectId,
    summary: `${created.reference}: ${name} for ${client.name}${
      currency === client.currency ? '' : `, billed in ${currency}`
    }`,
  });

  // Closes the enquiry it came from. Conditional, so an enquiry already
  // turned into something else by someone else is left as they left it.
  const enquiryId = formText(formData, 'enquiryId');
  if (enquiryId) {
    await db.enquiry.updateMany({
      where: { id: enquiryId, deletedAt: null, status: { not: 'converted' } },
      data: { clientId: client.id, projectId: created.projectId, status: 'converted' },
    });
    revalidatePath('/admin/enquiries');
  }

  revalidatePath('/admin/projects');
  revalidatePath(`/admin/clients/${client.slug}`);
  redirect(`/projects/${created.slug}`);
}
