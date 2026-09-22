import type { ProjectStatus } from '@/generated/prisma/client';
import type { Tone } from '@/components/console/Tone';

/**
 * The project board's lanes.
 *
 * Fourteen statuses do not make fourteen columns — nobody can read a board that
 * wide. Each lane gathers the statuses that are one phase of the work, in the
 * order the work passes through them, and a card still shows its exact status.
 *
 * Cancelled projects are not on the board; they are in the list.
 *
 * Plain data, no server imports: the board is a client component.
 */
export type Lane = {
  key: string;
  label: string;
  statuses: ProjectStatus[];
  tone: Tone;
};

export const LANES: Lane[] = [
  { key: 'leads', label: 'Leads', statuses: ['lead'], tone: 'neutral' },
  {
    key: 'proposal',
    label: 'Proposal',
    statuses: ['proposal_draft', 'proposal_sent', 'proposal_accepted'],
    tone: 'violet',
  },
  { key: 'contract', label: 'Contract', statuses: ['contract_sent', 'contract_signed'], tone: 'amber' },
  {
    key: 'building',
    label: 'In progress',
    statuses: ['in_progress', 'client_review', 'launch_ready'],
    tone: 'blue',
  },
  { key: 'live', label: 'Launched', statuses: ['launched', 'handover'], tone: 'green' },
  { key: 'done', label: 'Done', statuses: ['closed'], tone: 'teal' },
  { key: 'hold', label: 'On hold', statuses: ['on_hold'], tone: 'orange' },
];

export function laneOf(status: ProjectStatus): Lane | undefined {
  return LANES.find((lane) => lane.statuses.includes(status));
}

/**
 * Where a card lands when it is dropped on a lane: the first status in that
 * lane the project is allowed to move to, or nothing if it cannot get there in
 * one step. The server decides again — this only chooses what to ask for.
 */
export function targetIn(lane: Lane, allowed: ProjectStatus[]): ProjectStatus | null {
  return lane.statuses.find((status) => allowed.includes(status)) ?? null;
}
