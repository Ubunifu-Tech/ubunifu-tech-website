'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import {
  AssetRequestStatus,
  LineItemStatus,
  ProjectStatus,
} from '@/generated/prisma/client';
import { requireStaff, recordAudit } from '@/lib/console/auth';
import { formatMoney, parseDateInput, parseMoney, toDateInputValue } from '@/lib/console/money';
import {
  guardsFor,
  isAllowed,
  loadGuardFacts,
  transitionsFor,
  type Guard,
} from '@/lib/console/transitions';

/** Statuses a fee line can be put into by hand. */
const LINE_STATUSES: LineItemStatus[] = [
  LineItemStatus.planned,
  LineItemStatus.active,
  LineItemStatus.deferred,
  LineItemStatus.paused,
  LineItemStatus.waived,
  LineItemStatus.cancelled,
];

const ASSET_STATUSES: AssetRequestStatus[] = [
  AssetRequestStatus.requested,
  AssetRequestStatus.received,
  AssetRequestStatus.waived,
  AssetRequestStatus.blocked,
];

export type MoveState = {
  status: 'idle' | 'error' | 'confirm' | 'done';
  message?: string;
  /** Warnings the staff member has to read and accept before it will go through. */
  guards?: Guard[];
  to?: string;
};

/**
 * Moves a project, and is the only thing in the codebase that writes
 * Project.status.
 *
 * Nothing about this is a dropdown-and-save. The status column is what the
 * portal shows the client, what every report counts, and what the money guards
 * hang off, so each change is checked against the table, checked against the
 * guards, written with the event that explains it, and refused outright if the
 * project moved underneath the person clicking.
 */
export async function moveProject(
  _previous: MoveState,
  formData: FormData,
): Promise<MoveState> {
  // A server action is a public endpoint; the form having been rendered proves
  // nothing about who is posting to it.
  const staff = await requireStaff();

  const projectId = String(formData.get('projectId') ?? '');
  const to = String(formData.get('to') ?? '');
  const expectedFrom = String(formData.get('expectedFrom') ?? '');
  const note = String(formData.get('note') ?? '').trim();
  const acknowledged = formData.get('acknowledged') === 'on';

  if (!Object.values(ProjectStatus).includes(to as ProjectStatus)) {
    return { status: 'error', message: 'That is not a state a project can be in.' };
  }
  const target = to as ProjectStatus;

  const project = await db.project.findFirst({
    where: { id: projectId, deletedAt: null },
    select: { id: true, slug: true, status: true, name: true, launchedAt: true, closedAt: true },
  });

  if (!project) {
    return { status: 'error', message: 'That project no longer exists.' };
  }

  /**
   * The state the form was rendered against. If it no longer matches, someone
   * else has moved this project since the page loaded, and going ahead would
   * write an event whose `from` is a lie — which silently breaks both the
   * resume lookup and any later correction.
   */
  if (expectedFrom !== project.status) {
    return {
      status: 'error',
      message: `Somebody moved this project to "${project.status.replace(/_/g, ' ')}" while this page was open. Reload to see where it actually is.`,
    };
  }

  const offered = await transitionsFor(project);
  if (!isAllowed(project.status, target, offered)) {
    return {
      status: 'error',
      message: 'A project cannot go from where this one is to there.',
    };
  }

  const facts = await loadGuardFacts(project.id);
  const guards = guardsFor(target, facts);

  const blocks = guards.filter((guard) => guard.severity === 'block');
  if (blocks.length > 0) {
    return { status: 'error', message: blocks[0]!.message, guards: blocks, to: target };
  }

  const warnings = guards.filter((guard) => guard.severity === 'warn');
  if (warnings.length > 0 && !acknowledged) {
    // Shown once, and only accepted deliberately. The acceptance then goes into
    // the event note, so it is attributable rather than a click nobody saw.
    return { status: 'confirm', guards: warnings, to: target };
  }

  const recordedNote = [
    note,
    warnings.length > 0
      ? `Accepted despite: ${warnings.map((guard) => guard.message).join(' | ')}`
      : null,
  ]
    .filter(Boolean)
    .join('\n\n');

  try {
    await db.$transaction(async (tx) => {
      /**
       * Conditional on the status we read. Two staff on two phones would
       * otherwise produce two events, one of which records a `from` that was
       * never true.
       */
      const moved = await tx.project.updateMany({
        where: { id: project.id, status: project.status },
        data: {
          status: target,
          // Write-once. launched → in_progress → launch_ready → launched is a
          // legitimate sequence when a bug is found at launch, and re-stamping
          // the date would move every renewal that was calculated from it.
          ...(target === 'launched' && !project.launchedAt ? { launchedAt: new Date() } : {}),
          ...(target === 'closed' && !project.closedAt ? { closedAt: new Date() } : {}),
        },
      });

      if (moved.count !== 1) {
        throw new Error('concurrent-move');
      }

      await tx.projectStatusEvent.create({
        data: {
          projectId: project.id,
          from: project.status,
          to: target,
          actorType: 'staff',
          actorId: staff.id,
          note: recordedNote || null,
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'concurrent-move') {
      return {
        status: 'error',
        message: 'Somebody moved this project at the same moment. Nothing was changed — reload and try again.',
      };
    }
    console.error('Project move failed', error);
    return { status: 'error', message: 'The project could not be moved. Nothing was changed.' };
  }

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'project.status_changed',
    entityType: 'Project',
    entityId: project.id,
    summary: `${project.status} → ${target}`,
    metadata: { acknowledgedWarnings: warnings.length },
  });

  revalidatePath(`/admin/projects/${project.slug}`);
  revalidatePath('/admin/projects');
  return { status: 'done', message: `Moved to ${target.replace(/_/g, ' ')}.` };
}

export type EditState = { status: 'idle' | 'done' | 'error'; message?: string };

/**
 * Prices a fee line and dates its renewal.
 *
 * These two fields are what the launch and contract guards are about, so this
 * is the screen that makes those guards satisfiable. A guard with no way to
 * clear it is not a guard, it is a dead end that teaches people to look for a
 * way round the system.
 */
export async function saveLineItem(
  _previous: EditState,
  formData: FormData,
): Promise<EditState> {
  const staff = await requireStaff();

  const lineItemId = String(formData.get('lineItemId') ?? '');
  const line = await db.lineItem.findUnique({
    where: { id: lineItemId },
    select: {
      id: true,
      label: true,
      currency: true,
      billingKind: true,
      // The current values, so the audit line can say what changed rather than
      // only what it changed to.
      amountMinor: true,
      status: true,
      nextDueAt: true,
      project: { select: { slug: true, deletedAt: true } },
    },
  });

  if (!line || line.project.deletedAt) {
    return { status: 'error', message: 'That fee line no longer exists.' };
  }

  const amountRaw = String(formData.get('amount') ?? '').trim();
  const amountMinor = amountRaw === '' ? 0 : parseMoney(amountRaw, line.currency);
  if (amountMinor === null) {
    return { status: 'error', message: 'That amount could not be read. Digits and a decimal point.' };
  }
  if (amountMinor < 0) {
    return { status: 'error', message: 'An amount cannot be negative. Use a credit note instead.' };
  }

  const recurring =
    line.billingKind === 'recurring_monthly' || line.billingKind === 'recurring_annual';
  const dueRaw = String(formData.get('nextDueAt') ?? '').trim();
  const nextDueAt = recurring && dueRaw ? parseDateInput(dueRaw) : null;

  if (recurring && dueRaw && !nextDueAt) {
    return { status: 'error', message: 'That date could not be read.' };
  }

  const statusRaw = String(formData.get('lineStatus') ?? '');
  const status = (LINE_STATUSES as string[]).includes(statusRaw)
    ? (statusRaw as LineItemStatus)
    : undefined;

  await db.lineItem.update({
    where: { id: line.id },
    data: {
      amountMinor,
      ...(recurring ? { nextDueAt } : {}),
      ...(status ? { status } : {}),
    },
  });

  /**
   * Only what actually differs, with both values.
   *
   * The previous version recorded the new amount alone, in raw minor units,
   * and said nothing about status or renewal date — so moving a line from
   * planned to waived wrote a row that read like a price edit, and nobody
   * could tell afterwards what the price had been. A price change is the one
   * thing on a project a client is most likely to dispute.
   */
  const changes: Record<string, [string, string]> = {};

  if (line.amountMinor !== amountMinor) {
    changes.amount = [
      formatMoney(line.amountMinor, line.currency),
      formatMoney(amountMinor, line.currency),
    ];
  }
  if (status && status !== line.status) {
    changes.status = [line.status, status];
  }
  if (recurring && line.nextDueAt?.getTime() !== nextDueAt?.getTime()) {
    changes.renewsOn = [
      line.nextDueAt ? toDateInputValue(line.nextDueAt) : 'not set',
      nextDueAt ? toDateInputValue(nextDueAt) : 'not set',
    ];
  }

  // Saving a form without touching anything is not an event.
  if (Object.keys(changes).length > 0) {
    await recordAudit({
      actorType: 'staff',
      actorId: staff.id,
      action: 'line_item.saved',
      entityType: 'LineItem',
      entityId: line.id,
      summary: `${line.label}: ${Object.entries(changes)
        .map(([field, [before, after]]) => `${field} ${before} → ${after}`)
        .join(', ')}`,
      metadata: { changes },
    });
  }

  revalidatePath(`/admin/projects/${line.project.slug}`);
  return { status: 'done', message: Object.keys(changes).length > 0 ? 'Saved.' : 'Nothing changed.' };
}

/** Ticking a deliverable off. The client sees this in their portal. */
export async function toggleDeliverable(
  _previous: EditState,
  formData: FormData,
): Promise<EditState> {
  const staff = await requireStaff();

  const id = String(formData.get('deliverableId') ?? '');
  const complete = formData.get('complete') === 'on';

  const deliverable = await db.deliverable.findUnique({
    where: { id },
    select: { id: true, title: true, phase: { select: { project: { select: { slug: true } } } } },
  });
  if (!deliverable) return { status: 'error', message: 'That item no longer exists.' };

  await db.deliverable.update({
    where: { id },
    data: { isComplete: complete, completedAt: complete ? new Date() : null },
  });

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: complete ? 'deliverable.completed' : 'deliverable.reopened',
    entityType: 'Deliverable',
    entityId: id,
    summary: deliverable.title,
  });

  revalidatePath(`/admin/projects/${deliverable.phase.project.slug}`);
  return { status: 'done' };
}

/**
 * Marking something we asked the client for as received, or as no longer
 * needed. Waiving matters as much as receiving: an outstanding request the
 * client can no longer satisfy sits in their portal making them feel behind.
 */
export async function setAssetRequestStatus(
  _previous: EditState,
  formData: FormData,
): Promise<EditState> {
  const staff = await requireStaff();

  const id = String(formData.get('assetRequestId') ?? '');
  const next = String(formData.get('assetStatus') ?? '');

  if (!(ASSET_STATUSES as string[]).includes(next)) {
    return { status: 'error', message: 'That is not a state a request can be in.' };
  }

  const request = await db.assetRequest.findUnique({
    where: { id },
    select: { id: true, title: true, project: { select: { slug: true } } },
  });
  if (!request) return { status: 'error', message: 'That request no longer exists.' };

  await db.assetRequest.update({
    where: { id },
    data: {
      status: next as AssetRequestStatus,
      receivedAt: next === 'received' ? new Date() : null,
    },
  });

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'asset_request.status_changed',
    entityType: 'AssetRequest',
    entityId: id,
    summary: `${request.title} → ${next}`,
  });

  revalidatePath(`/admin/projects/${request.project.slug}`);
  return { status: 'done' };
}
