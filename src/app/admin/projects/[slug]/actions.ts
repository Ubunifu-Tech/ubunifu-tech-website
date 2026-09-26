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
import { formText, webAddress } from '@/lib/console/form';
import { emailedAddresses } from '@/lib/console/updates';
import { withdrawOpenReviews } from '@/lib/console/reviews';
import { STAFF_LABEL } from '@/lib/console/project-status';

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
 * Moves a project. With advanceForDocument and advanceForReview in
 * transitions.ts, which move a project on when its documents are sent and
 * signed and when a review is asked for, this is all that writes
 * Project.status.
 *
 * Nothing about this is a dropdown-and-save. The status column is what the
 * portal shows the client, what every report counts, and what the money guards
 * hang off, so each change is checked against the table, checked against the
 * guards, written with the event that explains it, and refused outright if the
 * project moved underneath the person clicking.
 */
export async function moveProject(_previous: MoveState, formData: FormData): Promise<MoveState> {
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
      message: `Somebody moved this project to ${STAFF_LABEL[project.status]} while this page was open. Reload to see where it is now.`,
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
  const seesMoney = can(staff, 'invoices') || can(staff, 'fees');
  const guards = guardsFor(target, facts, { seesMoney });

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

  // Written without amounts: the stage history is read by people who do not
  // handle money.
  const plainWarnings = guardsFor(target, facts, { seesMoney: false }).filter(
    (guard) => guard.severity === 'warn',
  );
  const recordedNote = [
    note,
    plainWarnings.length > 0
      ? `Accepted despite: ${plainWarnings.map((guard) => guard.message).join(' | ')}`
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

      // A review is only open while the project is with the client for
      // review. Moving on takes it back, so the client is not left being
      // asked to approve work the team has moved past.
      if (target !== 'client_review') await withdrawOpenReviews(tx, project.id);
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'concurrent-move') {
      return {
        status: 'error',
        message:
          'Somebody moved this project at the same moment. Nothing was changed. Reload and try again.',
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
  return { status: 'done', message: `Moved to ${STAFF_LABEL[target]}.` };
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

  const deliverable = await db.deliverable.findFirst({
    where: { id, phase: { project: { deletedAt: null } } },
    select: {
      id: true,
      title: true,
      assigneeId: true,
      phase: { select: { project: { select: { slug: true } } } },
    },
  });
  if (!deliverable) return { status: 'error', message: 'That item no longer exists.' };
  // Running projects, or it is your own task: anyone can be given a task, and
  // whoever does the work should be able to say it is done.
  if (!can(staff, 'projects') && deliverable.assigneeId !== staff.id) {
    return { status: 'error', message: NO_PERMISSION };
  }

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
  if (!can(staff, 'projects')) return { status: 'error', message: NO_PERMISSION };

  const id = String(formData.get('assetRequestId') ?? '');
  const next = String(formData.get('assetStatus') ?? '');

  if (!(ASSET_STATUSES as string[]).includes(next)) {
    return { status: 'error', message: 'That is not a state a request can be in.' };
  }

  const request = await db.assetRequest.findFirst({
    where: { id, project: { deletedAt: null } },
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
/** An update's words and link, checked the same way for a new one and an edit. */
function readUpdate(
  formData: FormData,
):
  | { ok: true; title: string; bodyMarkdown: string; previewUrl: string }
  | { ok: false; message: string } {
  const title = String(formData.get('title') ?? '').trim();
  const bodyMarkdown = formText(formData, 'body');
  const typedUrl = String(formData.get('previewUrl') ?? '').trim();
  const previewUrl = typedUrl ? webAddress(typedUrl) : '';

  if (title.length < 3 || title.length > 160) {
    return { ok: false, message: 'Give the update a short title.' };
  }
  if (bodyMarkdown.length < 10 || bodyMarkdown.length > 8000) {
    return { ok: false, message: 'Write a little more than that.' };
  }
  if (previewUrl === null) {
    return { ok: false, message: 'The link should be a full address, starting with https://' };
  }
  return { ok: true, title, bodyMarkdown, previewUrl };
}

export async function saveUpdate(_previous: EditState, formData: FormData): Promise<EditState> {
  const staff = await requireStaff();
  if (!can(staff, 'projects')) return { status: 'error', message: NO_PERMISSION };

  const projectId = String(formData.get('projectId') ?? '');
  const read = readUpdate(formData);
  if (!read.ok) return { status: 'error', message: read.message };
  const { title, bodyMarkdown, previewUrl } = read;

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
export async function publishUpdate(_previous: EditState, formData: FormData): Promise<EditState> {
  const staff = await requireStaff();
  if (!can(staff, 'projects')) return { status: 'error', message: NO_PERMISSION };
  const updateId = String(formData.get('updateId') ?? '');

  // Never to the people of a project, or a client, that has been removed.
  const update = await db.projectUpdate.findFirst({
    where: { id: updateId, project: { deletedAt: null } },
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
  if (update.status !== 'draft') {
    return {
      status: 'error',
      message:
        update.status === 'withdrawn'
          ? 'This was sent and then taken down. Put it back instead.'
          : 'This has already been sent.',
    };
  }

  // Conditional on still being a draft, so a second click cannot email
  // everyone twice.
  const claimed = await db.projectUpdate.updateMany({
    where: { id: update.id, status: 'draft' },
    data: { status: 'published', publishedAt: new Date() },
  });
  if (claimed.count !== 1) return { status: 'error', message: 'This has already been sent.' };

  const recipients = update.project.client.contacts;
  // Somebody still setting up from a shared link has no email yet. They are
  // not a failed send: nothing was tried, and they see it in the portal once
  // they are in. Counting them as recipients reported an email failure with
  // no reason anywhere.
  const emailable = recipients.flatMap((contact) =>
    contact.email ? [{ ...contact, email: contact.email }] : [],
  );
  const noEmail = recipients.filter((contact) => !contact.email).map((contact) => contact.name);
  let delivered = 0;

  for (const contact of emailable) {
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

  const unreached =
    noEmail.length > 0
      ? `${listNames(noEmail)} ${noEmail.length === 1 ? 'has' : 'have'} no email yet`
      : null;

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action:
      emailable.length === 0
        ? 'project_update.published'
        : delivered === emailable.length
          ? 'project_update.sent'
          : 'project_update.send_failed',
    entityType: 'ProjectUpdate',
    entityId: update.id,
    summary:
      recipients.length === 0
        ? `${update.title}: nobody on this client can receive email`
        : emailable.length === 0
          ? `${update.title}: nobody was emailed, ${unreached}`
          : `${update.title}: emailed ${delivered} of ${emailable.length}${unreached ? `; ${unreached}` : ''}`,
  });

  revalidatePath(`/admin/projects/${update.project.slug}`);

  if (recipients.length === 0) {
    return {
      status: 'done',
      message:
        'Published to the portal. Nobody on this client can receive email, so nothing was sent.',
    };
  }
  if (emailable.length === 0) {
    return {
      status: 'done',
      message: `Published to their portal. Nobody was emailed: ${unreached}.`,
    };
  }
  const alsoUnreached = unreached
    ? ` ${unreached}, so ${noEmail.length === 1 ? 'was' : 'were'} not emailed.`
    : '';
  if (delivered < emailable.length) {
    return {
      status: 'error',
      message: `Published and in their portal, but only ${delivered} of ${emailable.length} emails went out. See Activity for why.${alsoUnreached}`,
    };
  }
  return { status: 'done', message: `Published and emailed to ${delivered}.${alsoUnreached}` };
}

/**
 * Changes a draft. Only a draft: once an update is published it is what the
 * client was told, and it stays as it was sent.
 */
export async function editUpdate(_previous: EditState, formData: FormData): Promise<EditState> {
  const staff = await requireStaff();
  if (!can(staff, 'projects')) return { status: 'error', message: NO_PERMISSION };

  const read = readUpdate(formData);
  if (!read.ok) return { status: 'error', message: read.message };

  const update = await db.projectUpdate.findFirst({
    where: { id: formText(formData, 'updateId'), project: { deletedAt: null } },
    select: { id: true, project: { select: { slug: true } } },
  });
  if (!update) return { status: 'error', message: 'That update no longer exists.' };

  const changed = await db.projectUpdate.updateMany({
    where: { id: update.id, status: 'draft' },
    data: {
      title: read.title,
      bodyMarkdown: read.bodyMarkdown,
      previewUrl: read.previewUrl || null,
    },
  });
  if (changed.count === 0) {
    return { status: 'error', message: 'It has been sent already, so it stays as it was sent.' };
  }

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'project_update.edited',
    entityType: 'ProjectUpdate',
    entityId: update.id,
    summary: read.title,
  });
  revalidatePath(`/admin/projects/${update.project.slug}`);
  return { status: 'done', message: 'Saved.' };
}

/** Throws a draft away. Nobody outside the team ever saw it. */
export async function discardUpdate(_previous: EditState, formData: FormData): Promise<EditState> {
  const staff = await requireStaff();
  if (!can(staff, 'projects')) return { status: 'error', message: NO_PERMISSION };

  const update = await db.projectUpdate.findFirst({
    where: { id: formText(formData, 'updateId'), project: { deletedAt: null } },
    select: { id: true, title: true, project: { select: { slug: true } } },
  });
  if (!update) return { status: 'error', message: 'That update no longer exists.' };

  const gone = await db.projectUpdate.deleteMany({ where: { id: update.id, status: 'draft' } });
  if (gone.count === 0) {
    return { status: 'error', message: 'It has been sent already, so it stays on record.' };
  }

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'project_update.discarded',
    entityType: 'ProjectUpdate',
    entityId: update.id,
    summary: update.title,
  });
  revalidatePath(`/admin/projects/${update.project.slug}`);
  return { status: 'done', message: 'Discarded.' };
}

/**
 * Takes a published update out of the client's portal: posted on the wrong
 * project, or wrong in a way that matters. It is kept, marked, because it was
 * emailed, and it can be put back.
 */
export async function takeDownUpdate(_previous: EditState, formData: FormData): Promise<EditState> {
  const staff = await requireStaff();
  if (!can(staff, 'projects')) return { status: 'error', message: NO_PERMISSION };
  return setUpdateShown(staff.id, formText(formData, 'updateId'), false);
}

/** Puts a taken-down update back in the portal, without emailing it again. */
export async function putBackUpdate(_previous: EditState, formData: FormData): Promise<EditState> {
  const staff = await requireStaff();
  if (!can(staff, 'projects')) return { status: 'error', message: NO_PERMISSION };
  return setUpdateShown(staff.id, formText(formData, 'updateId'), true);
}

async function setUpdateShown(staffId: string, updateId: string, shown: boolean): Promise<EditState> {
  const update = await db.projectUpdate.findFirst({
    where: { id: updateId, project: { deletedAt: null } },
    select: { id: true, title: true, project: { select: { slug: true } } },
  });
  if (!update) return { status: 'error', message: 'That update no longer exists.' };

  const changed = await db.projectUpdate.updateMany({
    where: { id: update.id, status: shown ? 'withdrawn' : 'published' },
    data: { status: shown ? 'published' : 'withdrawn' },
  });
  if (changed.count === 0) {
    return { status: 'error', message: 'It changed a moment ago. Reload to see where it stands.' };
  }

  await recordAudit({
    actorType: 'staff',
    actorId: staffId,
    action: shown ? 'project_update.put_back' : 'project_update.taken_down',
    entityType: 'ProjectUpdate',
    entityId: update.id,
    summary: update.title,
  });
  revalidatePath(`/admin/projects/${update.project.slug}`);
  revalidatePath('/portal', 'layout');
  return { status: 'done', message: shown ? 'Back in their portal.' : 'Taken down.' };
}

/**
 * Emails a published update to the people it has not reached yet: those
 * whose email failed, and anyone given an address since. Nobody who already
 * has it gets it twice.
 */
export async function emailUpdateToRest(
  _previous: EditState,
  formData: FormData,
): Promise<EditState> {
  const staff = await requireStaff();
  if (!can(staff, 'projects')) return { status: 'error', message: NO_PERMISSION };

  const update = await db.projectUpdate.findFirst({
    where: { id: formText(formData, 'updateId'), status: 'published', project: { deletedAt: null } },
    select: {
      id: true,
      title: true,
      bodyMarkdown: true,
      previewUrl: true,
      notifiedAt: true,
      project: {
        select: {
          slug: true,
          name: true,
          client: {
            select: {
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
  if (!update) return { status: 'error', message: 'That update is not in their portal yet.' };

  const reached = await emailedAddresses([update.id]);
  const already = reached.get(update.id) ?? new Set<string>();
  const rest = update.project.client.contacts.flatMap((contact) =>
    contact.email && !already.has(contact.email.toLowerCase())
      ? [{ ...contact, email: contact.email }]
      : [],
  );
  if (rest.length === 0) return { status: 'done', message: 'Everyone with an email has it.' };

  let delivered = 0;
  for (const contact of rest) {
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
  if (delivered > 0 && !update.notifiedAt) {
    await db.projectUpdate.update({ where: { id: update.id }, data: { notifiedAt: new Date() } });
  }

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: delivered === rest.length ? 'project_update.sent' : 'project_update.send_failed',
    entityType: 'ProjectUpdate',
    entityId: update.id,
    summary: `${update.title}: emailed ${delivered} of ${rest.length} not reached before`,
  });
  revalidatePath(`/admin/projects/${update.project.slug}`);

  return delivered === rest.length
    ? { status: 'done', message: `Emailed to ${delivered}.` }
    : {
        status: 'error',
        message: `Only ${delivered} of ${rest.length} went out. See Activity for why.`,
      };
}

/** "Asha", "Asha and Baraka", "Asha, Baraka and Juma". */
function listNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
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
