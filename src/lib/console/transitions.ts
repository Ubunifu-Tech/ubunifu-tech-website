import 'server-only';
import { db } from '@/lib/db';
import type {
  ActorType,
  DocumentKind,
  DocumentStatus,
  Prisma,
  ProjectStatus,
  ReviewStatus,
} from '@/generated/prisma/client';
import { STAFF_LABEL } from './project-status';
import { formatMoney } from './money';
import { waitingOnClient } from './live';

/**
 * The delivery state machine.
 *
 * A whitelist. Anything not in this table is refused, so omission is the block
 * and no rule has to be written to forbid nonsense like closed → proposal_sent.
 *
 * Three decisions shape it, and each one is a decision about what the record is
 * allowed to claim later:
 *
 * 1. REVISIONS DO NOT MOVE THE PROJECT. A proposal rewritten after being sent
 *    produces a new document version; the project stays at proposal_sent,
 *    because the client is still holding a proposal. Otherwise the client's
 *    portal flickers between "preparing your proposal" and "proposal with you"
 *    while they are reading it, and the pipeline fills with noise that the
 *    document trail already records better.
 *
 * 2. NO GUARD BLOCKS ON MONEY HAVING ARRIVED. Payments are typed in by hand, so
 *    an invoice with no payment against it might mean an unpaid client or a
 *    mobile-money transfer on Friday that nobody has entered yet. A block there
 *    has one obvious workaround — recording a payment that did not happen — and
 *    that corrupts the one record which has to stay true. Money gates warn,
 *    name the amount, and write the acknowledgement into the status event.
 *
 * 3. A PROJECT THAT DELIVERED CANNOT LATER CLAIM IT DID NOT. launched, handover
 *    and closed have no edge to cancelled. A cancelled row carrying a launch
 *    date and a live domain is not a status mistake, it is a false record, and
 *    every delivery figure computed from status afterwards is wrong. Work that
 *    shipped and then ended is closed, with the reason in the note.
 */

export type GuardSeverity = 'block' | 'warn';

export type Guard = {
  severity: GuardSeverity;
  message: string;
  /**
   * Where it is put right, so every warning has a way forward. `billing` is
   * the Fees tab too, but for invoices and payments rather than prices, which
   * not everyone who can price is allowed to touch.
   */
  fix?: 'fees' | 'billing' | 'documents' | 'updates' | 'overview' | 'review';
};

export type Transition = {
  to: ProjectStatus;
  label: string;
  /** Rendered next to the button, so the consequence is read before the click. */
  detail?: string;
  tone?: 'primary' | 'quiet' | 'danger';
};

/**
 * Edges, by originating status.
 *
 * on_hold has no edges listed and cancelled only the one back to lead: where
 * they can go depends on where the project was before, so the rest are
 * computed in transitionsFor().
 */
const TABLE: Record<ProjectStatus, Transition[]> = {
  lead: [
    { to: 'proposal_draft', label: 'Mark as writing the proposal', tone: 'quiet' },
    {
      to: 'proposal_sent',
      label: 'Record a proposal already sent',
      detail: 'For one sent before you used the console.',
      tone: 'quiet',
    },
    { to: 'cancelled', label: 'Mark as lost', tone: 'danger' },
  ],
  proposal_draft: [
    {
      to: 'proposal_sent',
      label: 'Record the proposal as sent',
      detail: 'If it went by email or on paper.',
      tone: 'quiet',
    },
    { to: 'lead', label: 'Not ready for a proposal yet', tone: 'quiet' },
    { to: 'cancelled', label: 'Drop this before sending', tone: 'danger' },
  ],
  proposal_sent: [
    { to: 'proposal_accepted', label: 'Client accepted', tone: 'primary' },
    {
      to: 'proposal_draft',
      label: 'Pull the proposal back',
      detail: 'Only if it was sent by mistake.',
      tone: 'quiet',
    },
    { to: 'cancelled', label: 'Mark the proposal lost', tone: 'danger' },
  ],
  proposal_accepted: [
    {
      to: 'contract_sent',
      label: 'Record the agreement as sent',
      detail: 'If it went by email or on paper.',
      tone: 'quiet',
    },
    {
      to: 'in_progress',
      label: 'Start work without an agreement',
      detail: 'Noted in the history as started without a signature.',
      tone: 'quiet',
    },
    { to: 'proposal_sent', label: 'They have not actually accepted', tone: 'quiet' },
    {
      to: 'on_hold',
      label: 'Park it for now',
      detail: 'Accepted, but not starting yet.',
      tone: 'quiet',
    },
    { to: 'cancelled', label: 'Cancel, not going ahead', tone: 'danger' },
  ],
  contract_sent: [
    { to: 'contract_signed', label: 'Mark as signed', tone: 'primary' },
    { to: 'proposal_accepted', label: 'Withdraw and renegotiate', tone: 'quiet' },
    { to: 'cancelled', label: 'Withdraw and cancel', tone: 'danger' },
  ],
  contract_signed: [
    { to: 'in_progress', label: 'Start the work', tone: 'primary' },
    { to: 'on_hold', label: 'Pause before kick-off', tone: 'quiet' },
    { to: 'cancelled', label: 'Cancel the engagement', tone: 'danger' },
  ],
  in_progress: [
    {
      to: 'client_review',
      label: 'Mark as with the client for review',
      detail: 'When it went to them another way. Otherwise use Ask for a review, below.',
      tone: 'quiet',
    },
    { to: 'launch_ready', label: 'Mark ready to launch', tone: 'primary' },
    {
      to: 'handover',
      label: 'Go straight to handover',
      detail: 'For work with nothing to launch, like a brand kit or a report.',
      tone: 'quiet',
    },
    { to: 'closed', label: 'Close without handover', tone: 'quiet' },
    { to: 'on_hold', label: 'Pause the work', tone: 'quiet' },
    { to: 'cancelled', label: 'Cancel the project', tone: 'danger' },
  ],
  client_review: [
    { to: 'in_progress', label: 'Work on their feedback', tone: 'primary' },
    { to: 'launch_ready', label: 'Approved, ready to launch', tone: 'primary' },
    { to: 'handover', label: 'Approved, hand it over', tone: 'quiet' },
    { to: 'on_hold', label: 'Pause the work', tone: 'quiet' },
    { to: 'cancelled', label: 'Cancel during review', tone: 'danger' },
  ],
  launch_ready: [
    { to: 'launched', label: 'Go live', tone: 'primary' },
    {
      to: 'handover',
      label: 'Hand over without launching',
      detail: 'When the client puts it live themselves.',
      tone: 'quiet',
    },
    {
      to: 'closed',
      label: 'Finish without launching',
      detail: 'Delivered, but not going live.',
      tone: 'quiet',
    },
    { to: 'client_review', label: 'Back to the client to check', tone: 'quiet' },
    { to: 'in_progress', label: 'Back to the work', tone: 'quiet' },
    { to: 'on_hold', label: 'Hold the launch', tone: 'quiet' },
    { to: 'cancelled', label: 'Cancel before launch', tone: 'danger' },
  ],
  launched: [
    { to: 'handover', label: 'Start handover', tone: 'primary' },
    { to: 'closed', label: 'Close without handover', tone: 'quiet' },
    { to: 'in_progress', label: 'Undo the launch', tone: 'quiet' },
    { to: 'on_hold', label: 'Suspend the live service', tone: 'quiet' },
  ],
  handover: [
    { to: 'closed', label: 'Close the project', tone: 'primary' },
    { to: 'in_progress', label: 'Reopen for more work', tone: 'quiet' },
    { to: 'on_hold', label: 'Pause the handover', tone: 'quiet' },
  ],
  closed: [
    {
      to: 'in_progress',
      label: 'Reopen this project',
      detail: 'For more of the same work. New work is a new project.',
      tone: 'quiet',
    },
    { to: 'handover', label: 'Reopen the handover', tone: 'quiet' },
  ],
  on_hold: [],
  cancelled: [
    {
      to: 'lead',
      label: 'It is back on',
      detail: 'Starts again as a lead.',
      tone: 'quiet',
    },
  ],
};

/**
 * The real next step, where it happens somewhere other than a status change.
 *
 * Sending a proposal or an agreement is done from Documents, which creates the
 * signature request, emails the client and moves the project on by itself. A
 * status button labelled "Send" did none of that, so the send lives here as a
 * link, and the status edges above are worded as records of something sent
 * another way.
 */
export const NEXT_STEP: Partial<Record<ProjectStatus, { label: string; kind: 'proposal' | 'contract' }>> = {
  lead: { label: 'Write the proposal', kind: 'proposal' },
  proposal_draft: { label: 'Send the proposal', kind: 'proposal' },
  proposal_accepted: { label: 'Send the agreement for signing', kind: 'contract' },
};

/** Neither of these has any outgoing edge that is not a revival or a resume. */
export const TERMINAL: ProjectStatus[] = ['closed', 'cancelled'];

/**
 * The deal, in order: from first contact to a signed agreement.
 *
 * Sending and signing documents moves a project along this line by itself,
 * so a project whose agreement is signed does not still read "Lead" and
 * offer to start a proposal. It only ever moves forward, and only while the
 * project is still on this line: a project already in the work, on hold or
 * cancelled is left where it is. Each move is recorded like any other, with
 * the document that caused it.
 */
const DEAL: ProjectStatus[] = [
  'lead',
  'proposal_draft',
  'proposal_sent',
  'proposal_accepted',
  'contract_sent',
  'contract_signed',
];

export type DocumentMilestone = 'sent' | 'signed';

/** Where a document's sending or signing puts the project, if anywhere. */
export function stageAfterDocument(
  current: ProjectStatus,
  kind: DocumentKind,
  milestone: DocumentMilestone,
): ProjectStatus | null {
  const target: ProjectStatus | null =
    kind === 'proposal'
      ? milestone === 'sent'
        ? 'proposal_sent'
        : 'proposal_accepted'
      : kind === 'contract' || kind === 'statement_of_work'
        ? milestone === 'sent'
          ? 'contract_sent'
          : 'contract_signed'
        : null;
  if (!target) return null;
  const from = DEAL.indexOf(current);
  const to = DEAL.indexOf(target);
  return from !== -1 && to > from ? target : null;
}

/**
 * The furthest stage a project's documents put it at, when that is ahead of
 * where the project says it is: for projects whose documents went out before
 * sending and signing moved them on. Null when it is up to date.
 */
export function documentStage(
  status: ProjectStatus,
  documents: { reference: string; kind: DocumentKind; status: string }[],
): { reference: string; kind: DocumentKind; milestone: DocumentMilestone; to: ProjectStatus } | null {
  let best: { reference: string; kind: DocumentKind; milestone: DocumentMilestone; to: ProjectStatus } | null =
    null;
  for (const document of documents) {
    const milestone: DocumentMilestone | null =
      document.status === 'signed'
        ? 'signed'
        : document.status === 'sent' || document.status === 'viewed'
          ? 'sent'
          : null;
    if (!milestone) continue;
    const to = stageAfterDocument(status, document.kind, milestone);
    if (to && (!best || DEAL.indexOf(to) > DEAL.indexOf(best.to))) {
      best = { reference: document.reference, kind: document.kind, milestone, to };
    }
  }
  return best;
}

/**
 * Moves the project on for a document, inside the caller's transaction, and
 * records why. Returns the move, or null when there was nothing to move.
 */
export async function advanceForDocument(
  tx: Prisma.TransactionClient,
  input: {
    projectId: string;
    kind: DocumentKind;
    milestone: DocumentMilestone;
    reference: string;
    actorType: ActorType;
    actorId: string | null;
  },
): Promise<{ from: ProjectStatus; to: ProjectStatus } | null> {
  const project = await tx.project.findUnique({
    where: { id: input.projectId },
    select: { status: true },
  });
  if (!project) return null;
  const to = stageAfterDocument(project.status, input.kind, input.milestone);
  if (!to) return null;

  // Conditional on the status just read, like every other move.
  const moved = await tx.project.updateMany({
    where: { id: input.projectId, status: project.status },
    data: { status: to },
  });
  if (moved.count !== 1) return null;

  await tx.projectStatusEvent.create({
    data: {
      projectId: input.projectId,
      from: project.status,
      to,
      actorType: input.actorType,
      actorId: input.actorId,
      note: `${input.reference} ${input.milestone === 'signed' ? 'signed' : 'sent for signature'}`,
    },
  });
  return { from: project.status, to };
}

/**
 * Puts the project with the client for review when a review is asked for,
 * inside the caller's transaction, and records why. Only along an edge the
 * table already has; a project already at review stays there, because a new
 * round is not a move. Returns the move, or null when there was none.
 */
export async function advanceForReview(
  tx: Prisma.TransactionClient,
  input: {
    projectId: string;
    round: number;
    title: string;
    actorType: ActorType;
    actorId: string | null;
  },
): Promise<{ from: ProjectStatus; to: ProjectStatus } | null> {
  const project = await tx.project.findUnique({
    where: { id: input.projectId },
    select: { status: true },
  });
  if (!project) return null;
  if (!TABLE[project.status].some((edge) => edge.to === 'client_review')) return null;

  const moved = await tx.project.updateMany({
    where: { id: input.projectId, status: project.status },
    data: { status: 'client_review' },
  });
  if (moved.count !== 1) return null;

  await tx.projectStatusEvent.create({
    data: {
      projectId: input.projectId,
      from: project.status,
      to: 'client_review',
      actorType: input.actorType,
      actorId: input.actorId,
      note: `Round ${input.round} sent for review: ${input.title}`,
    },
  });
  return { from: project.status, to: 'client_review' };
}

/**
 * Where a held project is allowed to resume to.
 *
 * The held-from state is read back out of the event log rather than kept in a
 * column, so it cannot drift from the history. Resuming is allowed to that
 * state or one step on from it — a project paused during the build is often
 * resumed at review, because the client reviewed it while it was parked, and
 * forcing them back through the exact prior state would put a hop in the log
 * that never happened. One step, never a graph search: otherwise on_hold
 * becomes a hub from which anything is reachable.
 */
export async function heldFrom(projectId: string): Promise<ProjectStatus | null> {
  const event = await db.projectStatusEvent.findFirst({
    where: { projectId, to: 'on_hold' },
    orderBy: { createdAt: 'desc' },
    select: { from: true },
  });
  return event?.from ?? null;
}

/**
 * Where a cancelled project stood when it was cancelled, read back from the
 * event log the same way a hold is. A project cancelled by mistake, or
 * revived by the client, picks up there rather than starting over as a lead.
 */
export async function cancelledFrom(projectId: string): Promise<ProjectStatus | null> {
  const event = await db.projectStatusEvent.findFirst({
    where: { projectId, to: 'cancelled' },
    orderBy: { createdAt: 'desc' },
    select: { from: true },
  });
  return event?.from ?? null;
}

export async function transitionsFor(project: {
  id: string;
  status: ProjectStatus;
}): Promise<Transition[]> {
  if (project.status === 'cancelled') {
    const from = await cancelledFrom(project.id);
    if (!from || from === 'lead' || from === 'cancelled') return TABLE.cancelled;
    return [
      {
        to: from,
        label: `Pick it back up (${STAFF_LABEL[from].toLowerCase()})`,
        detail: 'Where it was when it was cancelled.',
        tone: 'primary',
      },
      ...TABLE.cancelled,
    ];
  }
  if (project.status !== 'on_hold') return TABLE[project.status];

  const held = await heldFrom(project.id);
  if (!held || held === 'on_hold') {
    // No readable hold origin. Rather than guess, offer the two ends that are
    // always honest: pick the work up, or close it out.
    return [
      { to: 'in_progress', label: 'Resume the work', tone: 'primary' },
      { to: 'closed', label: 'Close without resuming', tone: 'quiet' },
      { to: 'cancelled', label: 'Cancel this project', tone: 'danger' },
    ];
  }

  const onward = TABLE[held].filter((t) => t.to !== 'on_hold');
  const seen = new Set<ProjectStatus>();
  const resume: Transition[] = [];

  for (const candidate of [{ to: held, label: `Resume (${STAFF_LABEL[held].toLowerCase()})`, tone: 'primary' as const }, ...onward]) {
    if (seen.has(candidate.to) || candidate.to === 'on_hold') continue;
    seen.add(candidate.to);
    resume.push(candidate);
  }
  return resume;
}

/** Facts the guards need, loaded once per evaluation. */
export type GuardFacts = {
  currency: string;
  engagementType: string;
  linesPriced: number;
  linesUnpriced: number;
  committedMinor: number;
  currencies: string[];
  recurringWithoutDueDate: number;
  invoicedMinor: number;
  paidMinor: number;
  /** What has actually been demanded and not settled, per the invoices. */
  outstandingMinor: number;
  /** Build fees with no invoice raised against them yet. */
  uninvoicedOneOffMinor: number;
  /**
   * Whether this project ever delivered. Read from the record rather than from
   * the current status, because status can be walked backwards.
   */
  hasDelivered: boolean;
  signatureCount: number;
  openSignatureRequests: number;
  liveRecurringLines: number;
  activeManagedServices: number;
  outstandingAssetRequests: number;
  /** Proposals that went to the client from Documents, whatever became of them. */
  sentProposals: number;
  /** Agreements and statements of work that went to the client from Documents. */
  sentAgreements: number;
  /** The latest review the client was asked for, unless it was taken back. */
  latestReview: { round: number; status: ReviewStatus } | null;
};

export async function loadGuardFacts(projectId: string): Promise<GuardFacts> {
  const project = await db.project.findUniqueOrThrow({
    where: { id: projectId },
    select: {
      currency: true,
      engagementType: true,
      lineItems: {
        where: { status: { in: ['planned', 'active'] } },
        select: {
          amountMinor: true,
          quantity: true,
          currency: true,
          billingKind: true,
          nextDueAt: true,
          status: true,
        },
      },
      launchedAt: true,
      statusEvents: {
        where: { to: { in: ['launched', 'handover'] } },
        select: { id: true },
        take: 1,
      },
      invoices: {
        where: { status: { notIn: ['draft', 'void'] } },
        select: { totalMinor: true, paidMinor: true },
      },
      documents: {
        select: {
          kind: true,
          status: true,
          signatureRequests: {
            select: { status: true, signatures: { select: { id: true } } },
          },
        },
      },
      reviews: {
        where: { status: { not: 'withdrawn' } },
        orderBy: { round: 'desc' },
        take: 1,
        select: { round: true, status: true },
      },
      managedServices: { where: { isActive: true }, select: { id: true } },
      assetRequests: { where: waitingOnClient, select: { id: true } },
    },
  });

  const requests = project.documents.flatMap((d) => d.signatureRequests);

  return {
    currency: project.currency,
    engagementType: project.engagementType,
    linesPriced: project.lineItems.filter((l) => l.amountMinor > 0).length,
    linesUnpriced: project.lineItems.filter((l) => l.amountMinor === 0).length,
    committedMinor: project.lineItems.reduce((t, l) => t + l.amountMinor * l.quantity, 0),
    currencies: [...new Set(project.lineItems.filter((l) => l.amountMinor > 0).map((l) => l.currency))],
    recurringWithoutDueDate: project.lineItems.filter(
      (l) =>
        (l.billingKind === 'recurring_monthly' || l.billingKind === 'recurring_annual') &&
        l.nextDueAt === null,
    ).length,
    invoicedMinor: project.invoices.reduce((t, i) => t + i.totalMinor, 0),
    paidMinor: project.invoices.reduce((t, i) => t + i.paidMinor, 0),
    /**
     * Outstanding comes from the invoices, never from committed-minus-paid.
     * Committed value includes next year's domain and hosting renewals, which
     * are not owed today — subtracting payments from it reports a client who
     * has paid everything due as being in arrears, and a guard that cries wolf
     * at handover on every single project is one nobody reads by the third.
     */
    outstandingMinor: project.invoices.reduce(
      (total, invoice) => total + Math.max(0, invoice.totalMinor - invoice.paidMinor),
      0,
    ),
    /** Build fees only. A renewal that has not been invoiced is not late. */
    uninvoicedOneOffMinor: Math.max(
      0,
      project.lineItems
        .filter((l) => l.billingKind === 'one_off' || l.billingKind === 'installment')
        .reduce((t, l) => t + l.amountMinor * l.quantity, 0) -
        project.invoices.reduce((t, i) => t + i.totalMinor, 0),
    ),
    hasDelivered: project.launchedAt !== null || project.statusEvents.length > 0,
    signatureCount: requests.reduce((t, r) => t + r.signatures.length, 0),
    openSignatureRequests: requests.filter((r) => r.status === 'sent' || r.status === 'viewed').length,
    liveRecurringLines: project.lineItems.filter(
      (l) => l.billingKind === 'recurring_monthly' || l.billingKind === 'recurring_annual',
    ).length,
    activeManagedServices: project.managedServices.length,
    outstandingAssetRequests: project.assetRequests.length,
    sentProposals: project.documents.filter(
      (d) => d.kind === 'proposal' && WENT_OUT.includes(d.status),
    ).length,
    sentAgreements: project.documents.filter(
      (d) => (d.kind === 'contract' || d.kind === 'statement_of_work') && WENT_OUT.includes(d.status),
    ).length,
    latestReview: project.reviews[0] ?? null,
  };
}

/** Document statuses that mean it reached the client at some point. */
const WENT_OUT: DocumentStatus[] = ['sent', 'viewed', 'changes_requested', 'signed', 'declined', 'expired'];

/**
 * What must be true, and what merely ought to be.
 *
 * Blocks are only for checks that do not depend on money having arrived and
 * that the person clicking can satisfy in the next minute. Everything else
 * warns — and a warning that is dismissed is written into the status event, so
 * the decision is attributable rather than invisible.
 */
export function guardsFor(
  to: ProjectStatus,
  facts: GuardFacts,
  /** Whether amounts may be named. Without, each warning says the same, unpriced. */
  { seesMoney = true }: { seesMoney?: boolean } = {},
): Guard[] {
  const guards: Guard[] = [];
  const money = (minor: number) => formatMoney(minor, facts.currency);

  if (to === 'contract_sent' || to === 'launched' || to === 'closed') {
    if (facts.currencies.length > 1) {
      guards.push({
        severity: 'block',
        message: `Fees are in more than one currency (${facts.currencies.join(' and ')}). Put them all in one currency first.`,
        fix: 'fees',
      });
    }
  }

  if (to === 'contract_sent' && facts.linesUnpriced > 0) {
    guards.push({
      severity: 'block',
      message: `${facts.linesUnpriced} fee${facts.linesUnpriced === 1 ? ' has' : 's have'} no price yet. Price ${facts.linesUnpriced === 1 ? 'it' : 'them'} first.`,
        fix: 'fees',
    });
  }

  if (to === 'proposal_sent' && facts.sentProposals === 0) {
    guards.push({
      severity: 'warn',
      message:
        'No proposal has gone to the client from Documents. If it went by email or on paper, say so in the note.',
      fix: 'documents',
    });
  }

  if (to === 'contract_sent' && facts.sentAgreements === 0) {
    guards.push({
      severity: 'warn',
      message:
        'No agreement has gone to the client from Documents. If it went by email or on paper, say so in the note.',
      fix: 'documents',
    });
  }

  if (to === 'client_review' && facts.latestReview?.status !== 'open') {
    guards.push({
      severity: 'warn',
      message:
        'Nothing is out for the client to approve. Use Ask for a review so they can approve it or ask for changes.',
      fix: 'review',
    });
  }

  // Keyed on where the project is going, like every guard: these are the
  // stages that say the client is happy with the work.
  if ((to === 'launch_ready' || to === 'handover') && facts.latestReview) {
    const { round, status } = facts.latestReview;
    if (status === 'open') {
      guards.push({
        severity: 'warn',
        message: `Round ${round} is still with the client and has not been answered. Moving on takes it back from them.`,
      });
    } else if (status === 'changes_requested') {
      guards.push({
        severity: 'warn',
        message: `The client asked for changes in round ${round} and has not approved a version since.`,
        fix: 'review',
      });
    }
  }

  if (to === 'contract_signed' && facts.signatureCount === 0) {
    guards.push({
      severity: 'warn',
      message:
        'No signature is on file. If it was signed on paper or by email, say so in the note.',
        fix: 'documents',
    });
  }

  if (to === 'proposal_accepted' && facts.openSignatureRequests > 0) {
    guards.push({
      severity: 'warn',
      message: `${facts.openSignatureRequests === 1 ? 'A document is' : `${facts.openSignatureRequests} documents are`} still waiting for the client's signature. Withdraw ${facts.openSignatureRequests === 1 ? 'it' : 'them'} first.`,
        fix: 'documents',
    });
  }

  if (to === 'in_progress' && facts.paidMinor === 0 && facts.committedMinor > 0) {
    guards.push({
      severity: 'warn',
      message:
        facts.invoicedMinor === 0
          ? seesMoney
            ? `Nothing has been invoiced yet (${money(facts.committedMinor)} agreed). Consider sending the deposit invoice.`
            : 'Nothing has been invoiced yet. Consider asking for the deposit invoice to go out.'
          : seesMoney
            ? `${money(facts.invoicedMinor)} is invoiced but no payment is recorded yet.`
            : 'An invoice is out but no payment is recorded yet.',
        fix: 'billing',
    });
  }

  if (to === 'launched' && facts.recurringWithoutDueDate > 0) {
    guards.push({
      severity: 'block',
      message: `${facts.recurringWithoutDueDate} recurring fee${facts.recurringWithoutDueDate === 1 ? ' needs' : 's need'} a first payment date. Add ${facts.recurringWithoutDueDate === 1 ? 'it' : 'them'} first.`,
        fix: 'fees',
    });
  }

  if (to === 'launched' && facts.outstandingAssetRequests > 0) {
    guards.push({
      severity: 'warn',
      message: `The client still owes ${facts.outstandingAssetRequests} item${facts.outstandingAssetRequests === 1 ? '' : 's'}. If ${facts.outstandingAssetRequests === 1 ? 'it is' : 'they are'} not needed, mark ${facts.outstandingAssetRequests === 1 ? 'it' : 'them'} as not needed.`,
        fix: 'overview',
    });
  }

  if (to === 'handover' || to === 'closed') {
    if (facts.outstandingMinor > 0) {
      guards.push({
        severity: 'warn',
        message: `${seesMoney ? money(facts.outstandingMinor) : 'Money'} is still unpaid. It is harder to collect after handover.`,
        fix: 'billing',
      });
    }
    if (facts.uninvoicedOneOffMinor > 0) {
      guards.push({
        severity: 'warn',
        message: seesMoney
          ? `${money(facts.uninvoicedOneOffMinor)} of fees has not been invoiced yet.`
          : 'Some fees have not been invoiced yet.',
        fix: 'billing',
      });
    }
  }

  // Delivery is for good (see 3 above), so the first move that records it
  // asks for a second look instead of happening on one click.
  if ((to === 'launched' || to === 'handover') && !facts.hasDelivered) {
    guards.push({
      severity: 'warn',
      message:
        to === 'launched'
          ? 'This records today as the launch date. Afterwards the project can be closed, but not cancelled.'
          : 'This records the work as delivered. Afterwards the project can be closed, but not cancelled.',
    });
  }

  /**
   * The refusal that matters most, and it is a fact about the project rather
   * than about the edge it arrived on.
   *
   * Keying it to the current status would be trivially laundered: launched →
   * in_progress is a legitimate roll-back, and in_progress → cancelled is a
   * legitimate cancellation, so two ordinary clicks would produce a cancelled
   * project carrying a launch date, a receipt and a live domain. That row is
   * not a status mistake, it is a false record, and every delivery and revenue
   * figure derived from status afterwards would be wrong.
   */
  if (to === 'cancelled' && facts.hasDelivered) {
    guards.push({
      severity: 'block',
      message:
        'Already delivered. Close it instead.',
    });
  }

  if (to === 'closed' && (facts.liveRecurringLines > 0 || facts.activeManagedServices > 0)) {
    guards.push({
      severity: 'warn',
      message: `${facts.liveRecurringLines} recurring fee${facts.liveRecurringLines === 1 ? '' : 's'} and ${facts.activeManagedServices} service${facts.activeManagedServices === 1 ? '' : 's'} will keep renewing after it closes. To stop one, pause or cancel it on the Fees tab.`,
        fix: 'fees',
    });
  }

  if (to === 'cancelled' && facts.paidMinor > 0) {
    guards.push({
      severity: 'warn',
      message: `${seesMoney ? `${money(facts.paidMinor)} has` : 'Money has'} been paid. Cancelling does not refund it. Say in the note what happens to it.`,
        fix: 'billing',
    });
  }

  if (to === 'cancelled' && facts.openSignatureRequests > 0) {
    guards.push({
      severity: 'block',
      message: `${facts.openSignatureRequests === 1 ? 'A document is' : `${facts.openSignatureRequests} documents are`} still out for signature. Withdraw ${facts.openSignatureRequests === 1 ? 'it' : 'them'} first.`,
        fix: 'documents',
    });
  }

  return guards;
}

export function isAllowed(
  from: ProjectStatus,
  to: ProjectStatus,
  offered: Transition[],
): boolean {
  // Self-transitions are refused everywhere. on_hold → on_hold would make the
  // held-from lookup resolve to on_hold and strand the project permanently, and
  // it happens by double-click rather than by intent.
  if (from === to) return false;
  return offered.some((transition) => transition.to === to);
}
