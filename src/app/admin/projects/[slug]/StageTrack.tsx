'use client';

import { useActionState } from 'react';
import type { ProjectStatus } from '@/generated/prisma/client';
import { catchUpStage, type MoveState } from './actions';
import { Callout } from '@/components/console/Callout';
import forms from '@/styles/forms.module.css';
import styles from '../../Admin.module.css';

/** The life of a project in six stops, each covering the statuses inside it. */
const TRACK: { label: string; statuses: ProjectStatus[] }[] = [
  { label: 'Lead', statuses: ['lead'] },
  { label: 'Proposal', statuses: ['proposal_draft', 'proposal_sent', 'proposal_accepted'] },
  { label: 'Agreement', statuses: ['contract_sent', 'contract_signed'] },
  { label: 'The work', statuses: ['in_progress', 'client_review'] },
  { label: 'Launch', statuses: ['launch_ready', 'launched'] },
  { label: 'Handover', statuses: ['handover', 'closed'] },
];

/**
 * Where the project is between first contact and handover. A project on
 * hold shows where it was paused; a cancelled one shows where it stopped.
 */
export function StageTrack({
  status,
  statusLabel,
  pausedAt,
  heldFrom = null,
}: {
  status: ProjectStatus;
  statusLabel: string;
  /** For a project on hold or cancelled: the status it left from. */
  pausedAt: ProjectStatus | null;
  /**
   * For a project cancelled while on hold: the status it was held from.
   * The hold is not a stop on the line, so that is where it stopped.
   */
  heldFrom?: ProjectStatus | null;
}) {
  const stopped = status === 'on_hold' || status === 'cancelled';
  const left = pausedAt === 'on_hold' ? heldFrom : pausedAt;
  const at = stopped ? left : status;
  const current = at ? TRACK.findIndex((stop) => stop.statuses.includes(at)) : -1;

  // Stopped somewhere we cannot place: no track rather than one with every
  // stop still to come, which would read as never having started. The status
  // itself is in the badge beside the project's name.
  if (stopped && current === -1) return null;

  return (
    <ol className={`${styles.track} ${stopped ? styles.trackStopped : ''}`} aria-label="Where the project is">
      {TRACK.map((stop, index) => {
        const state = index < current ? 'done' : index === current ? 'current' : 'upcoming';
        return (
          <li
            key={stop.label}
            className={`${styles.trackStep} ${
              state === 'done' ? styles.trackDone : state === 'current' ? styles.trackCurrent : ''
            }`}
            aria-current={state === 'current' ? 'step' : undefined}
          >
            <span className={styles.trackLabel}>{stop.label}</span>
            {state === 'current' && <span className={styles.trackNow}>{statusLabel}</span>}
          </li>
        );
      })}
    </ol>
  );
}

const INITIAL: MoveState = { status: 'idle' };

/** For a project whose documents are ahead of it: one press brings it level. */
export function StageCatchUp({
  projectId,
  reference,
  what,
  to,
}: {
  projectId: string;
  reference: string;
  what: string;
  to: string;
}) {
  const [state, action, pending] = useActionState(catchUpStage, INITIAL);
  return (
    <Callout
      kind="info"
      action={
        <form action={action}>
          <input type="hidden" name="projectId" value={projectId} />
          <button type="submit" className={`${forms.button} ${forms.quiet}`} disabled={pending}>
            {pending ? 'Moving…' : `Move it to ${to}`}
          </button>
        </form>
      }
    >
      {reference} is {what}, so this project should be at {to}.
      {state.status === 'error' && <> {state.message}</>}
    </Callout>
  );
}
