import type { ProjectStatus } from '@/generated/prisma/client';

/**
 * The stages staff think in, over the statuses the record keeps.
 *
 * The fourteen statuses stay exactly as they are in the database, the history
 * and the client's portal. Staff see four, plus on hold and cancelled, because
 * the difference between a proposal being written and an agreement being out
 * for signature is the document's to tell, not the project's.
 */
export type Stage = 'deal' | 'in_progress' | 'delivered' | 'closed' | 'on_hold' | 'cancelled';

export const STAGE_OF: Record<ProjectStatus, Stage> = {
  lead: 'deal',
  proposal_draft: 'deal',
  proposal_sent: 'deal',
  proposal_accepted: 'deal',
  contract_sent: 'deal',
  contract_signed: 'deal',
  in_progress: 'in_progress',
  client_review: 'in_progress',
  launch_ready: 'in_progress',
  launched: 'delivered',
  handover: 'delivered',
  closed: 'closed',
  on_hold: 'on_hold',
  cancelled: 'cancelled',
};

export const STAGE_LABEL: Record<Stage, string> = {
  deal: 'Deal',
  in_progress: 'In progress',
  delivered: 'Delivered',
  closed: 'Closed',
  on_hold: 'On hold',
  cancelled: 'Cancelled',
};

/** The statuses in each stage, for lists that filter by stage. */
export function statusesIn(stage: Stage): ProjectStatus[] {
  return (Object.keys(STAGE_OF) as ProjectStatus[]).filter((status) => STAGE_OF[status] === stage);
}

/** Work that ends by going live, rather than by being handed over. */
const GOES_LIVE = new Set(['web', 'hosting', 'data', 'ai', 'product']);

/**
 * The one move that takes the project on, when there is one: start the work,
 * go live or hand it over by service line, then close. Everything else on
 * offer is a rarer move.
 */
export function primaryMove(status: ProjectStatus, serviceLine: string): ProjectStatus | null {
  switch (STAGE_OF[status]) {
    case 'deal':
      return 'in_progress';
    case 'in_progress':
      return GOES_LIVE.has(serviceLine) ? 'launched' : 'handover';
    case 'delivered':
      return 'closed';
    default:
      return null;
  }
}
