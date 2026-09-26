import type { ProjectStatus, ReviewStatus } from '@/generated/prisma/client';

/**
 * How a project's state is described to each audience.
 *
 * Two vocabularies, because the two readers need different things. Staff need
 * the pipeline stage, and "proposal_sent" is precise for them. A client needs
 * to know who the ball is with, and being told their project is "proposal_sent"
 * tells them nothing they did not already know — "with you to review" does.
 */

export const STAFF_LABEL: Record<ProjectStatus, string> = {
  lead: 'Lead',
  proposal_draft: 'Writing the proposal',
  proposal_sent: 'Proposal sent',
  proposal_accepted: 'Proposal accepted',
  contract_sent: 'Agreement sent',
  contract_signed: 'Agreement signed',
  in_progress: 'In progress',
  client_review: 'With the client to review',
  launch_ready: 'Ready to launch',
  launched: 'Launched',
  handover: 'Handover',
  closed: 'Closed',
  on_hold: 'On hold',
  cancelled: 'Cancelled',
};

export const CLIENT_LABEL: Record<ProjectStatus, string> = {
  lead: 'Getting started',
  proposal_draft: 'Preparing your proposal',
  proposal_sent: 'Proposal with you',
  proposal_accepted: 'Proposal accepted',
  contract_sent: 'Agreement with you to sign',
  contract_signed: 'Agreement signed',
  in_progress: 'In progress',
  client_review: 'Waiting on your review',
  launch_ready: 'Ready to launch',
  launched: 'Live',
  handover: 'Handing over to you',
  closed: 'Complete',
  on_hold: 'On hold',
  cancelled: 'Closed',
};

/**
 * Which badge a status wears.
 *
 * "live" is our violet, for anything in motion. Green is reserved for states
 * that mean the client has what they paid for. Amber marks the states where
 * somebody is waiting, which is the only signal on the list that should make
 * a staff member act today.
 */
export type StatusTone = 'neutral' | 'live' | 'good' | 'warn' | 'bad';

export const STATUS_TONE: Record<ProjectStatus, StatusTone> = {
  lead: 'neutral',
  proposal_draft: 'neutral',
  proposal_sent: 'warn',
  proposal_accepted: 'live',
  contract_sent: 'warn',
  contract_signed: 'live',
  in_progress: 'live',
  client_review: 'warn',
  launch_ready: 'live',
  launched: 'good',
  handover: 'live',
  closed: 'good',
  on_hold: 'warn',
  cancelled: 'bad',
};

/**
 * The stage as the client reads it. At review it depends on whether they
 * have answered: once they have, the next move is ours, and "waiting on your
 * review" would ask them for something they have already given. The same
 * goes for a proposal or agreement: once nothing is waiting for their
 * signature (they answered, or the time ran out), it is back with us.
 */
export function clientStage(
  status: ProjectStatus,
  latestReview?: { status: ReviewStatus } | null,
  signing?: { waiting: boolean },
): { label: string; tone: StatusTone } {
  if ((status === 'proposal_sent' || status === 'contract_sent') && signing?.waiting === false) {
    return { label: 'Back with us', tone: 'live' };
  }
  if (status === 'client_review' && latestReview?.status === 'approved') {
    return { label: 'Approved, over to us', tone: 'live' };
  }
  if (status === 'client_review' && latestReview?.status === 'changes_requested') {
    return { label: 'Making your changes', tone: 'live' };
  }
  return { label: CLIENT_LABEL[status], tone: STATUS_TONE[status] };
}

/** A project's service line, in a word. */
export const SERVICE_LABEL: Record<string, string> = {
  web: 'Web',
  hosting: 'Hosting',
  branding: 'Branding',
  data: 'Data',
  ai: 'AI',
  strategy: 'Strategy',
  product: 'Product',
  other: 'Other',
};

/** The service lines in full, as the project forms offer them. */
export const SERVICE_LINES = [
  { value: 'web', label: 'Websites & custom platforms' },
  { value: 'hosting', label: 'Hosting, domains & email' },
  { value: 'branding', label: 'Brand identity & design' },
  { value: 'data', label: 'Data & business intelligence' },
  { value: 'ai', label: 'AI & automation' },
  { value: 'strategy', label: 'Technology strategy & advisory' },
  { value: 'product', label: 'Product subscription' },
  { value: 'other', label: 'Something else' },
];

/** How a project is billed, as the project forms offer it. */
export const ENGAGEMENTS = [
  { value: 'fixed_price_project', label: 'Fixed price project' },
  { value: 'retainer', label: 'Monthly retainer' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'advisory', label: 'Advisory' },
  { value: 'support_only', label: 'Support only' },
];

/**
 * The groups the Projects list filters by, shared with the overview and the
 * sidebar so a number there is the number of rows the list shows.
 */
export const LIVE_STATUSES: ProjectStatus[] = ['contract_signed', 'in_progress', 'client_review', 'launch_ready'];
export const PIPELINE_STATUSES: ProjectStatus[] = [
  'lead',
  'proposal_draft',
  'proposal_sent',
  'proposal_accepted',
  'contract_sent',
];
