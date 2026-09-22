'use server';

import { NO_PERMISSION } from '@/lib/console/permissions';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { can, requireStaff, recordAudit } from '@/lib/console/auth';
import { consoleEnv } from '@/lib/console/env';
import { sendConsoleEmail } from '@/lib/console/mailer';
import { formatDate, parseDateInput } from '@/lib/console/money';
import { formText } from '@/lib/console/form';
import { taskAssignedEmail } from '@/lib/emails';

export type AssignState = { status: 'idle' | 'done' | 'error'; message?: string };

function refresh(slug: string) {
  revalidatePath(`/admin/projects/${slug}`);
  revalidatePath('/admin/projects');
  revalidatePath('/admin');
}

/** An active staff member, or null for "nobody". Anything else is refused. */
async function staffMember(id: string) {
  if (!id) return { ok: true as const, person: null };
  const person = await db.staffUser.findFirst({
    where: { id, isActive: true },
    select: { id: true, name: true, email: true },
  });
  return person ? { ok: true as const, person } : { ok: false as const };
}

/** Who leads the project. */
export async function setProjectLead(_previous: AssignState, formData: FormData): Promise<AssignState> {
  const staff = await requireStaff();
  if (!can(staff, 'projects')) return { status: 'error', message: NO_PERMISSION };
  const project = await db.project.findFirst({
    where: { id: formText(formData, 'projectId'), deletedAt: null },
    select: { id: true, slug: true, name: true, ownerId: true },
  });
  if (!project) return { status: 'error', message: 'That project no longer exists.' };

  const lead = await staffMember(formText(formData, 'ownerId'));
  if (!lead.ok) return { status: 'error', message: 'Choose someone on the team.' };
  if ((lead.person?.id ?? null) === project.ownerId) return { status: 'done' };

  await db.project.update({ where: { id: project.id }, data: { ownerId: lead.person?.id ?? null } });
  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'project.owner_changed',
    entityType: 'Project',
    entityId: project.id,
    summary: `${project.name}: ${lead.person ? `led by ${lead.person.name}` : 'no lead'}`,
  });

  refresh(project.slug);
  return { status: 'done' };
}

/**
 * Gives a task to someone. They get an email when somebody else gives it to
 * them, so work does not sit unnoticed until they next open the console.
 */
export async function assignTask(_previous: AssignState, formData: FormData): Promise<AssignState> {
  const staff = await requireStaff();
  const task = await db.deliverable.findUnique({
    where: { id: formText(formData, 'deliverableId') },
    select: {
      id: true,
      title: true,
      assigneeId: true,
      dueAt: true,
      phase: { select: { project: { select: { slug: true, name: true, deletedAt: true } } } },
    },
  });
  if (!task || task.phase.project.deletedAt) return { status: 'error', message: 'That task no longer exists.' };
  const project = task.phase.project;

  const assignee = await staffMember(formText(formData, 'assigneeId'));
  if (!assignee.ok) return { status: 'error', message: 'Choose someone on the team.' };
  if ((assignee.person?.id ?? null) === task.assigneeId) return { status: 'done' };

  await db.deliverable.update({
    where: { id: task.id },
    data: { assigneeId: assignee.person?.id ?? null },
  });
  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'deliverable.assigned',
    entityType: 'Deliverable',
    entityId: task.id,
    summary: `${task.title}: ${assignee.person ? assignee.person.name : 'nobody'}`,
  });

  if (assignee.person && assignee.person.id !== staff.id) {
    await sendConsoleEmail({
      to: assignee.person.email,
      subject: `${staff.name} gave you a task: ${task.title}`,
      html: taskAssignedEmail({
        name: assignee.person.name,
        by: staff.name,
        task: task.title,
        project: project.name,
        due: task.dueAt ? formatDate(task.dueAt) : null,
        url: `${consoleEnv.adminOrigin}/projects/${project.slug}?tab=plan`,
      }),
      template: 'task_assigned',
      entityType: 'Deliverable',
      entityId: task.id,
    });
  }

  refresh(project.slug);
  return { status: 'done' };
}

export async function setTaskDue(_previous: AssignState, formData: FormData): Promise<AssignState> {
  await requireStaff();
  const raw = formText(formData, 'dueAt');
  const dueAt = raw ? parseDateInput(raw) : null;
  if (raw && !dueAt) return { status: 'error', message: 'That date could not be read.' };

  const task = await db.deliverable.findUnique({
    where: { id: formText(formData, 'deliverableId') },
    select: { id: true, phase: { select: { project: { select: { slug: true } } } } },
  });
  if (!task) return { status: 'error', message: 'That task no longer exists.' };

  await db.deliverable.update({ where: { id: task.id }, data: { dueAt } });
  refresh(task.phase.project.slug);
  return { status: 'done' };
}

/** Who at the client is sending an item. Only one of that client's own people. */
export async function assignClientItem(
  _previous: AssignState,
  formData: FormData,
): Promise<AssignState> {
  const staff = await requireStaff();
  const item = await db.assetRequest.findUnique({
    where: { id: formText(formData, 'assetRequestId') },
    select: {
      id: true,
      title: true,
      assigneeId: true,
      project: { select: { slug: true, clientId: true } },
    },
  });
  if (!item) return { status: 'error', message: 'That item no longer exists.' };

  const contactId = formText(formData, 'assigneeId');
  const contact = contactId
    ? await db.clientContact.findFirst({
        where: { id: contactId, clientId: item.project.clientId, deletedAt: null },
        select: { id: true, name: true },
      })
    : null;
  if (contactId && !contact) return { status: 'error', message: 'Choose one of their people.' };
  if ((contact?.id ?? null) === item.assigneeId) return { status: 'done' };

  await db.assetRequest.update({ where: { id: item.id }, data: { assigneeId: contact?.id ?? null } });
  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'asset_request.assigned',
    entityType: 'AssetRequest',
    entityId: item.id,
    summary: `${item.title}: ${contact ? contact.name : 'nobody'}`,
  });

  refresh(item.project.slug);
  return { status: 'done' };
}
