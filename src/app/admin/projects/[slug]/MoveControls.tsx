'use client';

import React, { useActionState, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { moveProject, type MoveState } from './actions';
import type { Transition } from '@/lib/console/transitions';
import type { ProjectStatus } from '@/generated/prisma/client';
import { STAFF_LABEL } from '@/lib/console/project-status';
import { Callout } from '@/components/console/Callout';
import styles from './MoveControls.module.css';
import forms from '@/styles/forms.module.css';

const INITIAL: MoveState = { status: 'idle' };

export type StageAction = Transition & {
  /** Why this cannot happen right now, or null when it can. */
  blocked: string | null;
};

/**
 * Moving the project on.
 *
 * The main next steps are buttons; everything else is a quieter list under
 * them. A step that is not possible right now is shown greyed with the reason,
 * rather than as a warning about something nobody tried to do. The expected
 * status travels with the post, so a project moved by someone else in the
 * meantime is refused rather than recorded with a history that never happened.
 */
export function MoveControls({
  projectId,
  status,
  actions,
}: {
  projectId: string;
  status: ProjectStatus;
  actions: StageAction[];
}) {
  const [state, action, pending] = useActionState(moveProject, INITIAL);
  const [chosen, setChosen] = useState<StageAction | null>(null);

  const confirming = state.status === 'confirm' && state.to && chosen?.to === state.to;

  if (actions.length === 0) {
    return <p className={styles.rest}>This project is finished. New work starts as a new project.</p>;
  }

  const primary = actions.filter((item) => item.tone === 'primary' && !item.blocked);
  const others = actions.filter((item) => !primary.includes(item));

  return (
    <form action={action}>
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="expectedFrom" value={status} />
      <input type="hidden" name="to" value={chosen?.to ?? ''} />

      {confirming ? (
        <div className={styles.confirm}>
          <p className={styles.confirmTitle}>Move to {STAFF_LABEL[chosen!.to]}?</p>
          <Callout kind="warn" items={state.guards?.map((guard) => guard.message)} />

          <div className={forms.field}>
            <label className={forms.label} htmlFor="move-note">
              Note <span className={forms.optional}>(saved in the project history)</span>
            </label>
            <textarea
              id="move-note"
              name="note"
              className={`${forms.control} ${forms.textarea}`}
              maxLength={2000}
              placeholder="Why you are going ahead"
            />
          </div>

          <label className={forms.checkRow} htmlFor="move-ack">
            <input id="move-ack" name="acknowledged" type="checkbox" className={forms.check} required />
            <span className={forms.checkText}>I understand, move it anyway</span>
          </label>

          <div className={styles.confirmActions}>
            <button type="submit" className={forms.button} disabled={pending}>
              {pending ? 'Moving…' : `Move to ${STAFF_LABEL[chosen!.to]}`}
            </button>
            <button type="button" className={`${forms.button} ${forms.quiet}`} onClick={() => setChosen(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          {primary.length > 0 && (
            <div className={styles.primary}>
              {primary.map((item) => (
                <button
                  key={item.to}
                  type="submit"
                  className={forms.button}
                  disabled={pending}
                  onClick={() => setChosen(item)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {others.length > 0 && (
            <div className={styles.others}>
              <p className={styles.othersLabel}>{primary.length > 0 ? 'Other options' : 'Options'}</p>
              <ul className={styles.list}>
                {others.map((item) => (
                  <li key={item.to}>
                    <button
                      type="submit"
                      className={`${styles.option} ${item.tone === 'danger' ? styles.optionDanger : ''}`}
                      disabled={pending || item.blocked !== null}
                      onClick={() => setChosen(item)}
                    >
                      <span className={styles.optionText}>
                        <span className={styles.optionLabel}>{item.label}</span>
                        {(item.blocked ?? item.detail) && (
                          <span className={styles.optionDetail}>{item.blocked ?? item.detail}</span>
                        )}
                      </span>
                      {item.blocked === null && (
                        <ChevronRight size={16} strokeWidth={2} className={styles.optionIcon} aria-hidden="true" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {state.status === 'error' && (
        <p className={forms.error} role="alert">
          {state.message}
        </p>
      )}
      {state.status === 'done' && (
        <p className={styles.done} role="status" aria-live="polite">
          {state.message}
        </p>
      )}
    </form>
  );
}
