import 'server-only';
import { db } from '@/lib/db';
import type { ProjectStatus } from '@/generated/prisma/client';
import { STAFF_LABEL } from './project-status';
import { formatMoney } from './money';

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
  /** The project tab where it is put right, so every warning has a way forward. */
  fix?: 'fees' | 'documents' | 'overview';
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
 * on_hold and cancelled are deliberately absent as sources — their outgoing
 * edges depend on where the project was before, so they are computed in
 * transitionsFor() rather than listed.
 */
const TABLE: Record<ProjectStatus, Transition[]> = {
  lead: [
    { to: 'proposal_draft', label: 'Start a proposal', tone: 'primary' },
    {
      to: 'proposal_sent',
      label: 'Record a proposal already sent',
      detail: 'For one sent before you used the console.',
      tone: 'quiet',
    },
    { to: 'cancelled', label: 'Mark as lost', tone: 'danger' },
  ],
  proposal_draft: [
    { to: 'proposal_sent', label: 'Send the proposal', tone: 'primary' },
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
    { to: 'contract_sent', label: 'Send the agreement for signing', tone: 'primary' },
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
    { to: 'client_review', label: 'Send for client review', tone: 'primary' },
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

/** Neither of these has any outgoing edge that is not a revival or a resume. */
export const TERMINAL: ProjectStatus[] = ['closed', 'cancelled'];

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

export async function transitionsFor(project: {
  id: string;
  status: ProjectStatus;
}): Promise<Transition[]> {
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
          signatureRequests: {
            select: { status: true, signatures: { select: { id: true } } },
          },
        },
      },
      managedServices: { where: { isActive: true }, select: { id: true } },
      assetRequests: { where: { status: 'requested' }, select: { id: true } },
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
  };
}

/**
 * What must be true, and what merely ought to be.
 *
 * Blocks are only for checks that do not depend on money having arrived and
 * that the person clicking can satisfy in the next minute. Everything else
 * warns — and a warning that is dismissed is written into the status event, so
 * the decision is attributable rather than invisible.
 */
export function guardsFor(to: ProjectStatus, facts: GuardFacts): Guard[] {
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
          ? `Nothing has been invoiced yet (${money(facts.committedMinor)} agreed). Consider sending the deposit invoice.`
          : `${money(facts.invoicedMinor)} is invoiced but no payment is recorded yet.`,
        fix: 'fees',
    });
  }

  if (to === 'launched' && facts.recurringWithoutDueDate > 0) {
    guards.push({
      severity: 'block',
      message: `${facts.recurringWithoutDueDate} recurring fee${facts.recurringWithoutDueDate === 1 ? ' needs' : 's need'} a renewal date. Add ${facts.recurringWithoutDueDate === 1 ? 'it' : 'them'} first.`,
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
        message: `${money(facts.outstandingMinor)} is still unpaid. It is harder to collect after handover.`,
        fix: 'fees',
      });
    }
    if (facts.uninvoicedOneOffMinor > 0) {
      guards.push({
        severity: 'warn',
        message: `${money(facts.uninvoicedOneOffMinor)} of fees has not been invoiced yet.`,
        fix: 'fees',
      });
    }
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
      message: `${facts.liveRecurringLines} recurring fee${facts.liveRecurringLines === 1 ? '' : 's'} and ${facts.activeManagedServices} service${facts.activeManagedServices === 1 ? '' : 's'} are still active. Closing does not stop them. Say in the note what happens to each.`,
        fix: 'fees',
    });
  }

  if (to === 'cancelled' && facts.paidMinor > 0) {
    guards.push({
      severity: 'warn',
      message: `${money(facts.paidMinor)} has been paid. Cancelling does not refund it. Say in the note what happens to it.`,
        fix: 'fees',
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
