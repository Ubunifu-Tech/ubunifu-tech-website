import 'server-only';
import { db } from '@/lib/db';
import { recordAudit, type StaffActor } from '@/lib/console/auth';
import {
  findVercelProject,
  ownVercelProjectId,
  setVercelPaused,
  VERCEL_PROBLEM,
  vercelConfigured,
} from '@/lib/console/hosting';
import {
  NOTICE_CHANNELS,
  noticeChannelLabel,
  noticeDayProblem,
  pauseStanding,
  VERCEL_PROJECT_ID,
  type HostingInvoice,
  type NoticeChannel,
  type PauseStanding,
} from '@/lib/console/hosting-rules';
import { liveInvoice } from '@/lib/console/live';
import { formatShortDate, numbers, parseDateInput } from '@/lib/console/money';

/**
 * Hosting links: which Vercel project serves a console project, and pausing
 * or resuming it.
 *
 * Pausing takes a client's site offline, so every rule about it is here and
 * is checked on the server each time, whatever a page showed: only an owner,
 * only for an invoice that is overdue today, and only once an overdue notice
 * to the client is on record. The console assistant has no action for any of
 * this. A person presses the button.
 */

export type HostingResult = { ok: true; message: string } | { ok: false; message: string };

const OWNERS_ONLY = 'Only an owner can do this.';
const OWN_PROJECT =
  'That is the Vercel project this console runs on. Pausing it would take the console down, so it cannot be linked to a client project.';

const isOwner = (staff: StaffActor) => staff.role === 'owner';

/** What the Hosting section and the pause rule read about a project. */
export async function hostingFacts(projectId: string, now = new Date()) {
  const project = numbers(
    await db.project.findFirst({
      where: { id: projectId, deletedAt: null },
      select: {
        id: true,
        slug: true,
        name: true,
        vercelProjectId: true,
        vercelProjectName: true,
        hostingPausedAt: true,
        invoices: {
          where: { ...liveInvoice, status: { in: ['sent', 'part_paid', 'overdue'] } },
          orderBy: { dueAt: 'asc' },
          select: {
            number: true,
            status: true,
            dueAt: true,
            totalMinor: true,
            paidMinor: true,
            overdueNotices: { select: { givenAt: true } },
          },
        },
      },
    }),
  );
  if (!project) return null;

  const invoices: HostingInvoice[] = project.invoices.map(({ overdueNotices, ...invoice }) => ({
    ...invoice,
    notices: overdueNotices,
  }));
  const standing: PauseStanding = pauseStanding({
    linked: Boolean(project.vercelProjectId),
    pausedAt: project.hostingPausedAt,
    invoices,
    now,
  });

  // A payment recorded since the pause is the usual reason to resume.
  const paidSince = project.hostingPausedAt
    ? await db.payment.findFirst({
        where: {
          reversedAt: null,
          createdAt: { gt: project.hostingPausedAt },
          invoice: { projectId: project.id },
        },
        orderBy: { createdAt: 'desc' },
        select: { receivedAt: true, invoice: { select: { number: true } } },
      })
    : null;

  return {
    project: {
      id: project.id,
      slug: project.slug,
      name: project.name,
      vercelProjectId: project.vercelProjectId,
      vercelProjectName: project.vercelProjectName,
      hostingPausedAt: project.hostingPausedAt,
    },
    standing,
    paidSince: paidSince ? { receivedAt: paidSince.receivedAt, invoiceNumber: paidSince.invoice.number } : null,
  };
}

/**
 * Links a console project to the Vercel project that serves it, or takes the
 * link away when given nothing. With an access token the id is looked up on
 * Vercel, and a project name is accepted in its place. Without one only a
 * well-formed id is kept, unchecked, so links can be filled in before the
 * token is.
 */
export async function linkHosting(input: {
  staff: StaffActor;
  projectId: string;
  vercelProject: string;
}): Promise<HostingResult> {
  if (!isOwner(input.staff)) return { ok: false, message: OWNERS_ONLY };
  const project = await db.project.findFirst({
    where: { id: input.projectId, deletedAt: null },
    select: { id: true, name: true, vercelProjectId: true, vercelProjectName: true, hostingPausedAt: true },
  });
  if (!project) return { ok: false, message: 'That project no longer exists.' };
  // The link says what Resume would resume. It stays put until that is done.
  if (project.hostingPausedAt) {
    return { ok: false, message: 'Hosting is paused. Resume it before changing or removing the link.' };
  }

  const typed = input.vercelProject.trim();
  if (!typed) {
    if (!project.vercelProjectId) return { ok: true, message: 'No Vercel project is linked.' };
    await db.project.update({
      where: { id: project.id },
      data: { vercelProjectId: null, vercelProjectName: null },
    });
    await recordAudit({
      actorType: 'staff',
      actorId: input.staff.id,
      action: 'project.hosting_unlinked',
      entityType: 'Project',
      entityId: project.id,
      summary: `${project.name}: no longer linked to ${project.vercelProjectName ?? project.vercelProjectId}`,
    });
    return { ok: true, message: 'Link removed.' };
  }
  if (typed.length > 100 || !/^[A-Za-z0-9._-]+$/.test(typed)) {
    return { ok: false, message: 'Enter the project id from Vercel. It starts with prj_.' };
  }

  let link: { id: string; name: string | null };
  if (vercelConfigured()) {
    const found = await findVercelProject(typed);
    if (!found.ok) return { ok: false, message: VERCEL_PROBLEM[found.problem] };
    link = found.value;
  } else {
    if (!VERCEL_PROJECT_ID.test(typed)) {
      return { ok: false, message: 'Enter the project id from Vercel. It starts with prj_.' };
    }
    link = { id: typed, name: null };
  }
  if (link.id === ownVercelProjectId()) return { ok: false, message: OWN_PROJECT };

  const elsewhere = await db.project.findFirst({
    where: { vercelProjectId: link.id, id: { not: project.id }, deletedAt: null },
    select: { name: true },
  });
  if (elsewhere) {
    return { ok: false, message: `That Vercel project is already linked to ${elsewhere.name}.` };
  }
  if (link.id === project.vercelProjectId && link.name === project.vercelProjectName) {
    return { ok: true, message: 'Already linked.' };
  }

  await db.project.update({
    where: { id: project.id },
    data: { vercelProjectId: link.id, vercelProjectName: link.name },
  });
  await recordAudit({
    actorType: 'staff',
    actorId: input.staff.id,
    action: 'project.hosting_linked',
    entityType: 'Project',
    entityId: project.id,
    summary: `${project.name}: linked to ${link.name ?? link.id} on Vercel`,
    metadata: { vercelProjectId: link.id, checked: link.name !== null },
  });
  return {
    ok: true,
    message: link.name
      ? `Linked to ${link.name}.`
      : 'Saved. It will be checked with Vercel once the access token is set.',
  };
}

/**
 * Pauses the linked Vercel project. Refused unless an owner asks, an invoice
 * on the project is overdue today, and an overdue notice is on record for it.
 */
export async function pauseHosting(input: { staff: StaffActor; projectId: string }): Promise<HostingResult> {
  if (!isOwner(input.staff)) return { ok: false, message: OWNERS_ONLY };
  const facts = await hostingFacts(input.projectId);
  if (!facts) return { ok: false, message: 'That project no longer exists.' };
  const { project, standing } = facts;
  if (!standing.allowed) return { ok: false, message: standing.reason };
  const vercelId = project.vercelProjectId!;
  if (vercelId === ownVercelProjectId()) return { ok: false, message: OWN_PROJECT };

  // Claimed first, in one statement, so two presses pause and record it once.
  const pausedAt = new Date();
  const claimed = await db.project.updateMany({
    where: { id: project.id, hostingPausedAt: null, vercelProjectId: vercelId },
    data: { hostingPausedAt: pausedAt },
  });
  if (claimed.count !== 1) return { ok: false, message: 'Hosting was paused a moment ago. Reload to see it.' };

  const paused = await setVercelPaused(vercelId, true);
  const site = project.vercelProjectName ?? vercelId;
  if (!paused.ok) {
    await db.project.updateMany({
      where: { id: project.id, hostingPausedAt: pausedAt },
      data: { hostingPausedAt: null },
    });
    await recordAudit({
      actorType: 'staff',
      actorId: input.staff.id,
      action: 'project.hosting_pause_failed',
      entityType: 'Project',
      entityId: project.id,
      summary: `${project.name}: ${site} was not paused. ${VERCEL_PROBLEM[paused.problem]}`,
    });
    return { ok: false, message: VERCEL_PROBLEM[paused.problem] };
  }

  await recordAudit({
    actorType: 'staff',
    actorId: input.staff.id,
    action: 'project.hosting_paused',
    entityType: 'Project',
    entityId: project.id,
    summary: `${project.name}: ${site} paused for ${standing.invoice.number}, overdue since ${formatShortDate(standing.invoice.dueAt)}, notice given ${formatShortDate(standing.notice.givenAt)}`,
    metadata: { vercelProjectId: vercelId, invoice: standing.invoice.number },
  });
  return { ok: true, message: 'Hosting paused. The site now shows that it is unavailable.' };
}

/**
 * Resumes the linked Vercel project. An owner can do this at any time: a
 * payment is the usual reason, but a pause made by mistake must be undoable
 * without one.
 */
export async function resumeHosting(input: { staff: StaffActor; projectId: string }): Promise<HostingResult> {
  if (!isOwner(input.staff)) return { ok: false, message: OWNERS_ONLY };
  const facts = await hostingFacts(input.projectId);
  if (!facts) return { ok: false, message: 'That project no longer exists.' };
  const { project, paidSince } = facts;
  if (!project.vercelProjectId) return { ok: false, message: 'No Vercel project is linked.' };
  if (!project.hostingPausedAt) return { ok: false, message: 'Hosting is not paused.' };

  const site = project.vercelProjectName ?? project.vercelProjectId;
  const resumed = await setVercelPaused(project.vercelProjectId, false);
  if (!resumed.ok) {
    await recordAudit({
      actorType: 'staff',
      actorId: input.staff.id,
      action: 'project.hosting_resume_failed',
      entityType: 'Project',
      entityId: project.id,
      summary: `${project.name}: ${site} was not resumed. ${VERCEL_PROBLEM[resumed.problem]}`,
    });
    return { ok: false, message: VERCEL_PROBLEM[resumed.problem] };
  }

  const cleared = await db.project.updateMany({
    where: { id: project.id, hostingPausedAt: { not: null } },
    data: { hostingPausedAt: null },
  });
  // Somebody else's press got there first; it has already been recorded.
  if (cleared.count === 1) {
    await recordAudit({
      actorType: 'staff',
      actorId: input.staff.id,
      action: 'project.hosting_resumed',
      entityType: 'Project',
      entityId: project.id,
      summary: `${project.name}: ${site} resumed${
        paidSince ? `, after a payment on ${paidSince.invoiceNumber}` : ', with no payment recorded since the pause'
      }`,
      metadata: { vercelProjectId: project.vercelProjectId },
    });
  }
  return { ok: true, message: 'Hosting resumed. The site is serving again.' };
}

/**
 * Writes down that the client was told an invoice is overdue. The console
 * sends nothing here: a person gave the notice and records when and how.
 */
export async function recordOverdueNotice(input: {
  staffId: string;
  invoiceId: string;
  givenAt: string;
  channel: string;
  note: string;
}): Promise<HostingResult> {
  const invoice = numbers(
    await db.invoice.findFirst({
      where: { id: input.invoiceId, ...liveInvoice },
      select: { id: true, number: true, status: true, dueAt: true, totalMinor: true, paidMinor: true },
    }),
  );
  if (!invoice) return { ok: false, message: 'That invoice no longer exists.' };
  if (invoice.status === 'draft' || invoice.status === 'void') {
    return { ok: false, message: 'Only an issued invoice can be overdue.' };
  }
  if (invoice.paidMinor >= invoice.totalMinor) {
    return { ok: false, message: 'This invoice is paid, so there is no overdue notice to record.' };
  }

  const givenAt = parseDateInput(input.givenAt.trim());
  if (!givenAt) return { ok: false, message: 'Choose the day the client was told.' };
  const problem = noticeDayProblem(invoice, givenAt, new Date());
  if (problem) return { ok: false, message: problem };

  const channel = NOTICE_CHANNELS.find((known) => known.value === input.channel)?.value as NoticeChannel | undefined;
  if (!channel) return { ok: false, message: 'Choose how the client was told.' };
  const note = input.note.trim().slice(0, 500);

  await db.overdueNotice.create({
    data: { invoiceId: invoice.id, givenAt, channel, note: note || null, recordedById: input.staffId },
  });
  await recordAudit({
    actorType: 'staff',
    actorId: input.staffId,
    action: 'invoice.overdue_notice_recorded',
    entityType: 'Invoice',
    entityId: invoice.id,
    summary: `${invoice.number}: given ${formatShortDate(givenAt)} by ${noticeChannelLabel(channel).toLowerCase()}`,
  });
  return { ok: true, message: 'Notice recorded.' };
}
