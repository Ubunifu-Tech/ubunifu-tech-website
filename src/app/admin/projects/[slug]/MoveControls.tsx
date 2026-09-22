'use client';

import React, { useActionState, useState } from 'react';
import { moveProject, type MoveState } from './actions';
import type { Transition } from '@/lib/console/transitions';
import styles from '../../Admin.module.css';
import forms from '@/styles/forms.module.css';

const INITIAL: MoveState = { status: 'idle' };

/**
 * Moving the project on.
 *
 * Buttons rather than a dropdown, because what a project can do next depends on
 * where it is, and a dropdown listing all fourteen states invites somebody to
 * pick one that makes no sense. The expected status travels with the post: if
 * the project moved while this page was open, the server refuses rather than
 * writing an event whose "from" never happened.
 */
export function MoveControls({
  projectId,
  status,
  transitions,
}: {
  projectId: string;
  status: string;
  transitions: Transition[];
}) {
  const [state, action, pending] = useActionState(moveProject, INITIAL);
  const [chosen, setChosen] = useState<Transition | null>(null);

  const confirming = state.status === 'confirm' && state.to && chosen?.to === state.to;

  if (transitions.length === 0) {
    return (
      <p className={styles.note}>
        This project has come to rest. New work for the same client starts as a new project, with
        its own reference.
      </p>
    );
  }

  return (
    <form action={action}>
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="expectedFrom" value={status} />
      <input type="hidden" name="to" value={chosen?.to ?? ''} />

      {confirming ? (
        <div className={forms.form}>
          <p className={forms.cardMeta}>
            Before moving this to <strong>{chosen!.to.replace(/_/g, ' ')}</strong>:
          </p>
          <ul className={styles.warnList}>
            {state.guards?.map((guard, index) => (
              <li key={index} className={styles.warnItem}>
                {guard.message}
              </li>
            ))}
          </ul>

          <div className={forms.field}>
            <label className={forms.label} htmlFor="move-note">
              What is happening, in your words
            </label>
            <textarea
              id="move-note"
              name="note"
              className={`${forms.control} ${forms.textarea}`}
              maxLength={2000}
              placeholder="Why this is going ahead anyway. This is the only record of the decision."
            />
          </div>

          <label className={forms.checkRow} htmlFor="move-ack">
            <input
              id="move-ack"
              name="acknowledged"
              type="checkbox"
              className={forms.check}
              required
            />
            <span className={forms.checkText}>
              <span>I have read the above and am going ahead</span>
              <span className={forms.hint}>
                Recorded against your name in the project&rsquo;s history, along with what you were
                warned about.
              </span>
            </span>
          </label>

          <div className={forms.actions}>
            <button type="submit" className={forms.button} disabled={pending}>
              {pending ? 'Moving…' : `Move to ${chosen!.to.replace(/_/g, ' ')}`}
            </button>
            <button
              type="button"
              className={`${forms.button} ${forms.quiet}`}
              onClick={() => setChosen(null)}
            >
              Not now
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.moves}>
          {transitions.map((transition) => (
            <div key={transition.to} className={styles.move}>
              <button
                type="submit"
                className={`${forms.button} ${
                  transition.tone === 'danger'
                    ? forms.danger
                    : transition.tone === 'quiet'
                      ? forms.quiet
                      : ''
                }`}
                disabled={pending}
                onClick={() => setChosen(transition)}
              >
                {transition.label}
              </button>
              {transition.detail && <p className={forms.hint}>{transition.detail}</p>}
            </div>
          ))}
        </div>
      )}

      {state.status === 'error' && (
        <p className={forms.error} role="alert">
          {state.message}
        </p>
      )}
      {state.status === 'done' && (
        <p className={forms.hint} role="status" aria-live="polite">
          {state.message}
        </p>
      )}
    </form>
  );
}
