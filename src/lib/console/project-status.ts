import type { ProjectStatus } from '@/generated/prisma/client';

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
  contract_sent: 'Contract sent',
  contract_signed: 'Contract signed',
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
