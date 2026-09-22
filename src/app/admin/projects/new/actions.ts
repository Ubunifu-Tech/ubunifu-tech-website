'use server';

import { NO_PERMISSION } from '@/lib/console/permissions';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { EngagementType, ProjectStatus, ServiceLine } from '@/generated/prisma/client';
import { can, requireStaff, recordAudit } from '@/lib/console/auth';
import { createProjectForClient } from '@/lib/console/onboarding';
import { parseDateInput } from '@/lib/console/money';
import { formText } from '@/lib/console/form';

export type NewProjectState = {
  status: 'idle' | 'error';
  message?: string;
  field?: string;
};

/** The same short list the onboarding form uses, and for the same reason. */
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
  return formText(formData, key);
}

/**
 * Starts another project for a client already on the books.
 *
 * Nothing here asks about the client — they exist, and their currency, country
 * and contacts already have answers. Asking again is how two records of the
 * same organisation end up disagreeing.
 */
export async function createProject(
  _previous: NewProjectState,
  formData: FormData,
): Promise<NewProjectState> {
  const staff = await requireStaff();
  if (!can(staff, 'projects')) return { status: 'error', message: NO_PERMISSION };

  const fail = (message: string, field?: string): NewProjectState => ({
    status: 'error',
    message,
    field,
  });

  const clientId = text(formData, 'clientId');
  const client = await db.client.findFirst({
    where: { id: clientId, deletedAt: null },
    select: { id: true, slug: true, name: true },
  });
  if (!client) return fail('That client no longer exists.');

  const name = text(formData, 'name');
  if (name.length < 2 || name.length > 160) {
    return fail('Give the project a name.', 'name');
  }

  const serviceLine = text(formData, 'serviceLine');
  if (!isMember(Object.values(ServiceLine), serviceLine)) {
    return fail('Choose a service line.', 'serviceLine');
  }

  const engagementType = text(formData, 'engagementType');
  if (!isMember(Object.values(EngagementType), engagementType)) {
    return fail('Choose how this work is billed.', 'engagementType');
  }

  const status = text(formData, 'status');
  if (!isMember(OPENING_STATUSES, status)) {
    return fail('Choose where this project stands today.', 'status');
  }

  const templateId = text(formData, 'templateId');
  if (templateId) {
    const template = await db.projectTemplate.findUnique({
      where: { id: templateId },
      select: { serviceLine: true },
    });
    if (!template) return fail('That plan no longer exists. Pick another.', 'templateId');
    if (template.serviceLine !== serviceLine) {
      return fail('That plan belongs to a different service line.', 'templateId');
    }
  }

  const startDate = parseDateInput(text(formData, 'startDate'));
  const targetDate = parseDateInput(text(formData, 'targetDate'));
  if (startDate && targetDate && targetDate < startDate) {
    return fail('The target date is before the start date.', 'targetDate');
  }

  let created;
  try {
    created = await createProjectForClient({
      clientId: client.id,
      name,
      serviceLine,
      engagementType,
      status,
      templateId: templateId || null,
      summary: text(formData, 'summary') || null,
      startDate,
      targetDate,
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
    summary: `${created.reference} — ${name} for ${client.name}`,
  });

  revalidatePath('/admin/projects');
  revalidatePath(`/admin/clients/${client.slug}`);
  redirect(`/projects/${created.slug}`);
}
