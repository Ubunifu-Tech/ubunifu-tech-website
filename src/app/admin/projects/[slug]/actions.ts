'use server';

import { NO_PERMISSION } from '@/lib/console/permissions';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { AssetRequestStatus, ProjectStatus } from '@/generated/prisma/client';
import { can, requireStaff, recordAudit } from '@/lib/console/auth';
import { consoleEnv } from '@/lib/console/env';
import { sendConsoleEmail } from '@/lib/console/mailer';
import { projectUpdateEmail } from '@/lib/emails';
import {
  advanceForDocument,
  documentStage,
  guardsFor,
  isAllowed,
  loadGuardFacts,
  transitionsFor,
  type Guard,
} from '@/lib/console/transitions';
import { formText } from '@/lib/console/form';


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
 * Moves a project. With advanceForDocument in transitions.ts, which moves a
 * project on when its documents are sent and signed, this is all that writes
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
  if (!can(staff, 'projects')) return { status: 'error', message: NO_PERMISSION };

  const projectId = String(formData.get('projectId') ?? '');
  const to = String(formData.get('to') ?? '');
  const expectedFrom = String(formData.get('expectedFrom') ?? '');
  const note = formText(formData, 'note');
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
        message: 'Somebody moved this project at the same moment. Nothing was changed. Reload and try again.',
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

/**
 * Posts an update to the client.
 *
 * Drafted and published in two steps on purpose. An update is the one thing
 * here written for someone outside the company to read, and there is no way to
 * unsend an email — so it is saved first, read back on the page as the client
 * will see it, and sent only when somebody presses send.
 */
export async function saveUpdate(
  _previous: EditState,
  formData: FormData,
): Promise<EditState> {
  const staff = await requireStaff();
  if (!can(staff, 'projects')) return { status: 'error', message: NO_PERMISSION };

  const projectId = String(formData.get('projectId') ?? '');
  const title = String(formData.get('title') ?? '').trim();
  const bodyMarkdown = formText(formData, 'body');
  const previewUrl = String(formData.get('previewUrl') ?? '').trim();

  if (title.length < 3 || title.length > 160) {
    return { status: 'error', message: 'Give the update a short title.' };
  }
  if (bodyMarkdown.length < 10 || bodyMarkdown.length > 8000) {
    return { status: 'error', message: 'Write a little more than that.' };
  }
  if (previewUrl) {
    try {
      const parsed = new URL(previewUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('scheme');
    } catch {
      return { status: 'error', message: 'The link should be a full address, starting with https://' };
    }
  }

  const project = await db.project.findFirst({
    where: { id: projectId, deletedAt: null },
    select: { id: true, slug: true },
  });
  if (!project) return { status: 'error', message: 'That project no longer exists.' };

  const update = await db.projectUpdate.create({
    data: {
      projectId: project.id,
      title,
      bodyMarkdown,
      previewUrl: previewUrl || null,
    },
    select: { id: true },
  });

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'project_update.drafted',
    entityType: 'ProjectUpdate',
    entityId: update.id,
    summary: title,
  });

  revalidatePath(`/admin/projects/${project.slug}`);
  return { status: 'done', message: 'Saved as a draft. Read it back, then send it.' };
}

/**
 * Publishes an update and emails the client.
 *
 * publishedAt is what the portal filters on, so it is set whether or not the
 * email leaves — the client can always read it by signing in, and an outage
 * must not hide an update that has been approved for them to see. The send
 * outcome is recorded separately, for exactly the same reason.
 */
export async function publishUpdate(
  _previous: EditState,
  formData: FormData,
): Promise<EditState> {
  const staff = await requireStaff();
  if (!can(staff, 'projects')) return { status: 'error', message: NO_PERMISSION };
  const updateId = String(formData.get('updateId') ?? '');

  const update = await db.projectUpdate.findUnique({
    where: { id: updateId },
    select: {
      id: true,
      title: true,
      bodyMarkdown: true,
      previewUrl: true,
      status: true,
      project: {
        select: {
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
        },
      },
    },
  });

  if (!update) return { status: 'error', message: 'That update no longer exists.' };
  if (update.status === 'published') {
    return { status: 'error', message: 'This has already been sent.' };
  }

  await db.projectUpdate.update({
    where: { id: update.id },
    data: { status: 'published', publishedAt: new Date() },
  });

  const recipients = update.project.client.contacts;
  let delivered = 0;

  for (const contact of recipients) {
    // Somebody still setting up from a shared link sees it in the portal.
    if (!contact.email) continue;
    const sent = await sendConsoleEmail({
      to: contact.email,
      subject: `${update.project.name}: ${update.title}`,
      html: projectUpdateEmail({
        name: contact.name,
        projectName: update.project.name,
        title: update.title,
        body: update.bodyMarkdown,
        previewUrl: update.previewUrl,
        url: `${consoleEnv.publicOrigin}/portal/projects/${update.project.slug}`,
      }),
      template: 'project_update',
      entityType: 'ProjectUpdate',
      entityId: update.id,
    });
    if (sent.ok) delivered += 1;
  }

  if (delivered > 0) {
    await db.projectUpdate.update({
      where: { id: update.id },
      data: { notifiedAt: new Date() },
    });
  }

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: delivered === recipients.length ? 'project_update.sent' : 'project_update.send_failed',
    entityType: 'ProjectUpdate',
    entityId: update.id,
    summary:
      recipients.length === 0
        ? `${update.title}: published, but this client has nobody to email`
        : `${update.title}: emailed ${delivered} of ${recipients.length}`,
  });

  revalidatePath(`/admin/projects/${update.project.slug}`);

  if (recipients.length === 0) {
    return {
      status: 'done',
      message: 'Published to the portal. Nobody on this client can receive email, so nothing was sent.',
    };
  }
  if (delivered < recipients.length) {
    return {
      status: 'error',
      message: `Published and in their portal, but only ${delivered} of ${recipients.length} emails went out. See Activity for why.`,
    };
  }
  return { status: 'done', message: `Published and emailed to ${delivered}.` };
}

/**
 * Brings a project's stage up to where its documents already are: an
 * agreement signed while the project still read "Lead", from before sending
 * and signing moved projects on by themselves. Forward only, and recorded
 * like any other move.
 */
export async function catchUpStage(_previous: MoveState, formData: FormData): Promise<MoveState> {
  const staff = await requireStaff();
  if (!can(staff, 'projects')) return { status: 'error', message: NO_PERMISSION };

  const projectId = formText(formData, 'projectId');
  const project = await db.project.findFirst({
    where: { id: projectId, deletedAt: null },
    select: {
      id: true,
      slug: true,
      status: true,
      documents: { select: { reference: true, kind: true, status: true } },
    },
  });
  if (!project) return { status: 'error', message: 'That project no longer exists.' };

  const step = documentStage(project.status, project.documents);
  if (!step) return { status: 'done', message: 'It is already up to date.' };

  const moved = await db.$transaction((tx) =>
    advanceForDocument(tx, {
      projectId: project.id,
      kind: step.kind,
      milestone: step.milestone,
      reference: step.reference,
      actorType: 'staff',
      actorId: staff.id,
    }),
  );
  if (!moved) {
    return { status: 'error', message: 'It moved a moment ago. Reload to see where it stands.' };
  }

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'project.status_changed',
    entityType: 'Project',
    entityId: project.id,
    summary: `${moved.from} → ${moved.to}, to match ${step.reference}`,
  });

  revalidatePath(`/admin/projects/${project.slug}`);
  revalidatePath('/portal', 'layout');
  return { status: 'done' };
}
