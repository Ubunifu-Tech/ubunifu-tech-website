'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { EngagementType, ServiceLine } from '@/generated/prisma/client';
import { NO_PERMISSION } from '@/lib/console/permissions';
import { can, recordAudit, requireStaff } from '@/lib/console/auth';
import { formText } from '@/lib/console/form';
import { parseDateInput } from '@/lib/console/money';
import { isCurrency } from '@/lib/console/currencies';
import { consoleEnv } from '@/lib/console/env';
import { uploadsConfigured } from '@/lib/console/uploads';
import { waitingOnClient } from '@/lib/console/live';
import { sendConsoleEmail } from '@/lib/console/mailer';
import { itemsNeededEmail } from '@/lib/emails';

/**
 * Building a project by hand: its details, its plan (phases and tasks) and
 * what we need from the client. Templates start a plan; these change it.
 *
 * Plan items are working notes rather than records anyone relies on, so a
 * removed phase or task is deleted outright. A request the client has already
 * answered or sent files for is set aside as no longer needed instead, so
 * what they sent stays attached to something.
 */

export type PlanState = { status: 'idle' | 'done' | 'error'; message?: string; field?: string };

async function allowed() {
  const staff = await requireStaff();
  return can(staff, 'projects') ? staff : null;
}

function refresh(slug: string) {
  revalidatePath(`/admin/projects/${slug}`);
  revalidatePath(`/portal/projects/${slug}`);
}

/** A date from the form, or null; undefined when it was not a date. */
function optionalDate(value: string): Date | null | undefined {
  if (!value) return null;
  return parseDateInput(value) ?? undefined;
}

// ── Project details ─────────────────────────────────────────────────────

export async function updateProjectDetails(
  _previous: PlanState,
  formData: FormData,
): Promise<PlanState> {
  const staff = await allowed();
  if (!staff) return { status: 'error', message: NO_PERMISSION };

  const project = await db.project.findFirst({
    where: { id: formText(formData, 'projectId'), deletedAt: null },
    select: {
      id: true,
      slug: true,
      currency: true,
      _count: { select: { invoices: true } },
      lineItems: {
        where: { status: { not: 'cancelled' }, amountMinor: { gt: 0 } },
        select: { id: true },
      },
    },
  });
  if (!project) return { status: 'error', message: 'That project no longer exists.' };

  const name = formText(formData, 'name');
  const summary = formText(formData, 'summary');
  const serviceLine = formText(formData, 'serviceLine');
  const engagementType = formText(formData, 'engagementType');
  const currency = formText(formData, 'currency') || project.currency;
  const startDate = optionalDate(formText(formData, 'startDate'));
  const targetDate = optionalDate(formText(formData, 'targetDate'));

  if (name.length < 2 || name.length > 160)
    return { status: 'error', message: 'Give the project a name.', field: 'name' };
  if (summary.length > 2000)
    return {
      status: 'error',
      message: 'Keep the summary to a paragraph or two.',
      field: 'summary',
    };
  if (!(Object.values(ServiceLine) as string[]).includes(serviceLine)) {
    return { status: 'error', message: 'Choose a service line.', field: 'serviceLine' };
  }
  if (!(Object.values(EngagementType) as string[]).includes(engagementType)) {
    return { status: 'error', message: 'Choose how it is billed.', field: 'engagementType' };
  }
  if (startDate === undefined || targetDate === undefined) {
    return { status: 'error', message: 'Those dates do not look right.', field: 'targetDate' };
  }
  if (startDate && targetDate && targetDate < startDate) {
    return {
      status: 'error',
      message: 'The target date is before the start.',
      field: 'targetDate',
    };
  }
  if (!isCurrency(currency))
    return { status: 'error', message: 'Choose a currency.', field: 'currency' };
  if (
    currency !== project.currency &&
    (project._count.invoices > 0 || project.lineItems.length > 0)
  ) {
    // Nothing here converts between currencies, so a priced fee would keep its
    // number and quietly change what it is worth.
    return {
      status: 'error',
      message:
        project._count.invoices > 0
          ? 'This project has invoices, so its currency stays as it is.'
          : 'Change the currency before the fees are priced, or remove the priced fees first.',
      field: 'currency',
    };
  }

  const details = {
    name,
    summary: summary || null,
    serviceLine: serviceLine as ServiceLine,
    engagementType: engagementType as EngagementType,
    currency,
    startDate,
    targetDate,
  };
  if (currency === project.currency) {
    await db.project.update({ where: { id: project.id }, data: details });
  } else {
    // The fees move with the project. Only unpriced ones can be here (priced
    // ones block the change above), so no amount changes what it means.
    await db.$transaction([
      db.project.update({ where: { id: project.id }, data: details }),
      db.lineItem.updateMany({
        where: { projectId: project.id, amountMinor: 0 },
        data: { currency },
      }),
    ]);
  }

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'project.details_saved',
    entityType: 'Project',
    entityId: project.id,
    summary: currency === project.currency ? name : `${name}, now charged in ${currency}`,
  });

  refresh(project.slug);
  return { status: 'done', message: 'Saved.' };
}

// ── Phases ──────────────────────────────────────────────────────────────

function phaseFields(formData: FormData) {
  return {
    name: formText(formData, 'name'),
    goal: formText(formData, 'goal'),
    startDate: optionalDate(formText(formData, 'startDate')),
    endDate: optionalDate(formText(formData, 'endDate')),
  };
}

function phaseProblem(fields: ReturnType<typeof phaseFields>): PlanState | null {
  if (fields.name.length < 2 || fields.name.length > 160) {
    return { status: 'error', message: 'Name the phase.', field: 'name' };
  }
  if (fields.goal.length > 1000)
    return { status: 'error', message: 'Keep the goal short.', field: 'goal' };
  if (fields.startDate === undefined || fields.endDate === undefined) {
    return { status: 'error', message: 'Those dates do not look right.', field: 'endDate' };
  }
  if (fields.startDate && fields.endDate && fields.endDate < fields.startDate) {
    return { status: 'error', message: 'The phase ends before it starts.', field: 'endDate' };
  }
  return null;
}

export async function addPhase(_previous: PlanState, formData: FormData): Promise<PlanState> {
  const staff = await allowed();
  if (!staff) return { status: 'error', message: NO_PERMISSION };

  const project = await db.project.findFirst({
    where: { id: formText(formData, 'projectId'), deletedAt: null },
    select: { id: true, slug: true },
  });
  if (!project) return { status: 'error', message: 'That project no longer exists.' };

  const fields = phaseFields(formData);
  const problem = phaseProblem(fields);
  if (problem) return problem;

  // Positions are unique per project; two people adding at once retry once.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const last = await db.projectPhase.findFirst({
      where: { projectId: project.id },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    try {
      const phase = await db.projectPhase.create({
        data: {
          projectId: project.id,
          name: fields.name,
          goal: fields.goal || null,
          startDate: fields.startDate ?? null,
          endDate: fields.endDate ?? null,
          position: (last?.position ?? 0) + 1,
        },
        select: { id: true },
      });
      await recordAudit({
        actorType: 'staff',
        actorId: staff.id,
        action: 'phase.added',
        entityType: 'Project',
        entityId: project.id,
        summary: fields.name,
        metadata: { phaseId: phase.id },
      });
      refresh(project.slug);
      return { status: 'done', message: `${fields.name} added.` };
    } catch (error) {
      if ((error as { code?: string }).code !== 'P2002') throw error;
    }
  }
  return {
    status: 'error',
    message: 'Somebody else changed the plan at the same moment. Try again.',
  };
}

export async function updatePhase(_previous: PlanState, formData: FormData): Promise<PlanState> {
  const staff = await allowed();
  if (!staff) return { status: 'error', message: NO_PERMISSION };

  const phase = await db.projectPhase.findFirst({
    where: { id: formText(formData, 'phaseId'), project: { deletedAt: null } },
    select: { id: true, project: { select: { id: true, slug: true } } },
  });
  if (!phase) return { status: 'error', message: 'That phase no longer exists.' };

  const fields = phaseFields(formData);
  const problem = phaseProblem(fields);
  if (problem) return problem;

  await db.projectPhase.update({
    where: { id: phase.id },
    data: {
      name: fields.name,
      goal: fields.goal || null,
      startDate: fields.startDate ?? null,
      endDate: fields.endDate ?? null,
    },
  });
  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'phase.saved',
    entityType: 'Project',
    entityId: phase.project.id,
    summary: fields.name,
    metadata: { phaseId: phase.id },
  });
  refresh(phase.project.slug);
  return { status: 'done', message: 'Saved.' };
}

export async function removePhase(_previous: PlanState, formData: FormData): Promise<PlanState> {
  const staff = await allowed();
  if (!staff) return { status: 'error', message: NO_PERMISSION };

  const phase = await db.projectPhase.findFirst({
    where: { id: formText(formData, 'phaseId'), project: { deletedAt: null } },
    select: { id: true, name: true, project: { select: { id: true, slug: true } } },
  });
  if (!phase) return { status: 'error', message: 'That phase no longer exists.' };

  // Its tasks go with it (the relation cascades); updates written against it
  // keep their text and lose the link.
  await db.projectPhase.delete({ where: { id: phase.id } });
  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'phase.removed',
    entityType: 'Project',
    entityId: phase.project.id,
    summary: phase.name,
  });
  refresh(phase.project.slug);
  return { status: 'done' };
}

// ── Tasks ───────────────────────────────────────────────────────────────

export async function addTask(_previous: PlanState, formData: FormData): Promise<PlanState> {
  const staff = await allowed();
  if (!staff) return { status: 'error', message: NO_PERMISSION };

  const phase = await db.projectPhase.findFirst({
    where: { id: formText(formData, 'phaseId'), project: { deletedAt: null } },
    select: { id: true, project: { select: { id: true, slug: true } } },
  });
  if (!phase) return { status: 'error', message: 'That phase no longer exists.' };

  const title = formText(formData, 'title');
  const dueAt = optionalDate(formText(formData, 'dueAt'));
  if (title.length < 2 || title.length > 300)
    return { status: 'error', message: 'Say what the task is.', field: 'title' };
  if (dueAt === undefined)
    return { status: 'error', message: 'That date does not look right.', field: 'dueAt' };

  const last = await db.deliverable.findFirst({
    where: { phaseId: phase.id },
    orderBy: { position: 'desc' },
    select: { position: true },
  });
  const task = await db.deliverable.create({
    data: {
      phaseId: phase.id,
      title,
      dueAt,
      position: (last?.position ?? 0) + 1,
      isClientVisible: formData.get('private') !== 'on',
    },
    select: { id: true },
  });
  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'deliverable.added',
    entityType: 'Project',
    entityId: phase.project.id,
    summary: title,
    metadata: { deliverableId: task.id },
  });
  refresh(phase.project.slug);
  return { status: 'done' };
}

export async function renameTask(_previous: PlanState, formData: FormData): Promise<PlanState> {
  const staff = await allowed();
  if (!staff) return { status: 'error', message: NO_PERMISSION };

  const task = await db.deliverable.findFirst({
    where: { id: formText(formData, 'deliverableId'), phase: { project: { deletedAt: null } } },
    select: { id: true, phase: { select: { project: { select: { id: true, slug: true } } } } },
  });
  if (!task) return { status: 'error', message: 'That task no longer exists.' };

  const title = formText(formData, 'title');
  if (title.length < 2 || title.length > 300)
    return { status: 'error', message: 'Say what the task is.' };

  await db.deliverable.update({ where: { id: task.id }, data: { title } });
  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'deliverable.renamed',
    entityType: 'Project',
    entityId: task.phase.project.id,
    summary: title,
    metadata: { deliverableId: task.id },
  });
  refresh(task.phase.project.slug);
  return { status: 'done' };
}

export async function removeTask(_previous: PlanState, formData: FormData): Promise<PlanState> {
  const staff = await allowed();
  if (!staff) return { status: 'error', message: NO_PERMISSION };

  const task = await db.deliverable.findFirst({
    where: { id: formText(formData, 'deliverableId'), phase: { project: { deletedAt: null } } },
    select: {
      id: true,
      title: true,
      phase: { select: { project: { select: { id: true, slug: true } } } },
    },
  });
  if (!task) return { status: 'error', message: 'That task no longer exists.' };

  await db.deliverable.delete({ where: { id: task.id } });
  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'deliverable.removed',
    entityType: 'Project',
    entityId: task.phase.project.id,
    summary: task.title,
    metadata: { deliverableId: task.id },
  });
  refresh(task.phase.project.slug);
  return { status: 'done' };
}

// ── What we need from the client ────────────────────────────────────────

export async function addAssetRequest(
  _previous: PlanState,
  formData: FormData,
): Promise<PlanState> {
  const staff = await allowed();
  if (!staff) return { status: 'error', message: NO_PERMISSION };

  const project = await db.project.findFirst({
    where: { id: formText(formData, 'projectId'), deletedAt: null },
    select: { id: true, slug: true },
  });
  if (!project) return { status: 'error', message: 'That project no longer exists.' };

  const title = formText(formData, 'title');
  const detail = formText(formData, 'detail');
  if (title.length < 2 || title.length > 200)
    return { status: 'error', message: 'Say what you need.', field: 'title' };
  if (detail.length > 1000)
    return { status: 'error', message: 'Keep the detail short.', field: 'detail' };

  const last = await db.assetRequest.findFirst({
    where: { projectId: project.id },
    orderBy: { position: 'desc' },
    select: { position: true },
  });
  const request = await db.assetRequest.create({
    data: {
      projectId: project.id,
      title,
      detail: detail || null,
      position: (last?.position ?? 0) + 1,
    },
    select: { id: true },
  });
  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'asset_request.added',
    entityType: 'Project',
    entityId: project.id,
    summary: title,
    metadata: { assetRequestId: request.id },
  });
  refresh(project.slug);
  return {
    status: 'done',
    message: 'Added to their list in the portal. Email them when you have added everything.',
  };
}

/**
 * Emails the client everything still waiting on them, as one list, with what
 * is new since they were last emailed marked as new. Staff send it when they
 * have finished adding, or later as a reminder.
 */
export async function emailItemList(_previous: PlanState, formData: FormData): Promise<PlanState> {
  const staff = await allowed();
  if (!staff) return { status: 'error', message: NO_PERMISSION };

  const project = await db.project.findFirst({
    where: { id: formText(formData, 'projectId'), deletedAt: null },
    select: {
      id: true,
      slug: true,
      name: true,
      client: {
        select: {
          name: true,
          contacts: {
            where: { deletedAt: null, canSignIn: true },
            select: { id: true, name: true, email: true },
          },
        },
      },
      assetRequests: {
        where: waitingOnClient,
        orderBy: { position: 'asc' },
        select: { id: true, title: true, detail: true, notifiedAt: true },
      },
    },
  });
  if (!project) return { status: 'error', message: 'That project no longer exists.' };
  if (project.assetRequests.length === 0) {
    return { status: 'error', message: 'Nothing is waiting on them.' };
  }
  const emailable = project.client.contacts.flatMap((contact) =>
    contact.email ? [{ ...contact, email: contact.email }] : [],
  );
  if (emailable.length === 0) {
    return { status: 'error', message: `Nobody at ${project.client.name} has an email yet.` };
  }

  const items = project.assetRequests.map((item) => ({
    title: item.title,
    detail: item.detail,
    isNew: item.notifiedAt === null,
  }));
  let delivered = 0;
  for (const contact of emailable) {
    const sent = await sendConsoleEmail({
      to: contact.email,
      subject: `${project.name}: what we need from you`,
      html: itemsNeededEmail({
        name: contact.name,
        projectName: project.name,
        items,
        url: `${consoleEnv.publicOrigin}/portal/projects/${project.slug}`,
        takesFiles: uploadsConfigured(),
      }),
      template: 'items_needed',
      entityType: 'Project',
      entityId: project.id,
    });
    if (sent.ok) delivered += 1;
  }

  if (delivered > 0) {
    await db.assetRequest.updateMany({
      where: { id: { in: project.assetRequests.map((item) => item.id) } },
      data: { notifiedAt: new Date() },
    });
  }
  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: delivered === emailable.length ? 'asset_request.list_sent' : 'asset_request.list_send_failed',
    entityType: 'Project',
    entityId: project.id,
    summary: `${items.length} ${items.length === 1 ? 'item' : 'items'}. Emailed ${delivered} of ${emailable.length}`,
  });
  refresh(project.slug);

  if (delivered === 0) {
    return { status: 'error', message: 'The email did not go out. See Activity for why.' };
  }
  if (delivered < emailable.length) {
    return {
      status: 'error',
      message: `Only ${delivered} of ${emailable.length} emails went out. See Activity for why.`,
    };
  }
  return { status: 'done', message: `Emailed to ${delivered}.` };
}

export async function updateAssetRequest(
  _previous: PlanState,
  formData: FormData,
): Promise<PlanState> {
  const staff = await allowed();
  if (!staff) return { status: 'error', message: NO_PERMISSION };

  const request = await db.assetRequest.findFirst({
    where: { id: formText(formData, 'assetRequestId'), project: { deletedAt: null } },
    select: { id: true, project: { select: { id: true, slug: true } } },
  });
  if (!request) return { status: 'error', message: 'That request no longer exists.' };

  const title = formText(formData, 'title');
  const detail = formText(formData, 'detail');
  if (title.length < 2 || title.length > 200)
    return { status: 'error', message: 'Say what you need.' };
  if (detail.length > 1000) return { status: 'error', message: 'Keep the detail short.' };

  await db.assetRequest.update({
    where: { id: request.id },
    data: { title, detail: detail || null },
  });
  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'asset_request.saved',
    entityType: 'Project',
    entityId: request.project.id,
    summary: title,
    metadata: { assetRequestId: request.id },
  });
  refresh(request.project.slug);
  return { status: 'done' };
}

export async function removeAssetRequest(
  _previous: PlanState,
  formData: FormData,
): Promise<PlanState> {
  const staff = await allowed();
  if (!staff) return { status: 'error', message: NO_PERMISSION };

  const request = await db.assetRequest.findFirst({
    where: { id: formText(formData, 'assetRequestId'), project: { deletedAt: null } },
    select: {
      id: true,
      title: true,
      response: true,
      project: { select: { id: true, slug: true } },
      _count: { select: { uploads: true } },
    },
  });
  if (!request) return { status: 'error', message: 'That request no longer exists.' };

  const answered = request._count.uploads > 0 || Boolean(request.response);
  if (answered) {
    await db.assetRequest.update({ where: { id: request.id }, data: { status: 'waived' } });
  } else {
    await db.assetRequest.delete({ where: { id: request.id } });
  }
  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'asset_request.removed',
    entityType: 'Project',
    entityId: request.project.id,
    summary: answered ? `${request.title} (kept, set as no longer needed)` : request.title,
    metadata: { assetRequestId: request.id },
  });
  refresh(request.project.slug);
  return { status: 'done' };
}
