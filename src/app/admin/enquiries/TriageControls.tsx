'use client';

import React, { useActionState } from 'react';
import { setEnquiryStatus, saveEnquiryNote, type TriageState } from './actions';
import styles from '../Admin.module.css';
import forms from '@/styles/forms.module.css';

const INITIAL: TriageState = { status: 'idle' };

const MOVES: { value: string; label: string }[] = [
  { value: 'new', label: 'Unread' },
  { value: 'triaged', label: 'Read, nothing sent yet' },
  { value: 'in_conversation', label: 'Talking to them' },
  { value: 'qualified', label: 'Real, worth a proposal' },
  { value: 'declined', label: 'Not for us' },
  { value: 'spam', label: 'Spam' },
];

export function TriageControls({
  id,
  status,
  note,
}: {
  id: string;
  status: string;
  note: string | null;
}) {
  const [moveState, moveAction, movePending] = useActionState(setEnquiryStatus, INITIAL);
  const [noteState, noteAction, notePending] = useActionState(saveEnquiryNote, INITIAL);

  return (
    <>
      <form action={noteAction} className={forms.field}>
        <input type="hidden" name="id" value={id} />
        <label className={forms.label} htmlFor={`note-${id}`}>
          Your note <span className={forms.optional}>(never shown to them)</span>
        </label>
        <textarea
          id={`note-${id}`}
          name="internalNote"
          defaultValue={note ?? ''}
          className={`${forms.control} ${forms.textarea}`}
          maxLength={2000}
          placeholder="Who they are, what they actually need, what you said."
        />
        <div className={styles.inlineForm}>
          <button type="submit" className={forms.link} disabled={notePending}>
            {notePending ? 'Saving…' : 'Save note'}
          </button>
          {noteState.message && (
            <span
              className={noteState.status === 'error' ? forms.error : forms.hint}
              role="status"
              aria-live="polite"
            >
              {noteState.message}
            </span>
          )}
        </div>
      </form>

      <form action={moveAction} className={styles.inlineForm}>
        <input type="hidden" name="id" value={id} />
        <label className={forms.label} htmlFor={`status-${id}`}>
          Where it stands
        </label>
        <span className={forms.selectWrap}>
          <select
            id={`status-${id}`}
            name="status"
            defaultValue={status}
            className={`${forms.control} ${forms.select}`}
            disabled={movePending}
          >
            {MOVES.map((move) => (
              <option key={move.value} value={move.value}>
                {move.label}
              </option>
            ))}
          </select>
        </span>
        <button type="submit" className={`${forms.button} ${forms.quiet}`} disabled={movePending}>
          {movePending ? 'Saving…' : 'Update'}
        </button>
        {moveState.status === 'error' && (
          <span className={forms.error} role="status" aria-live="polite">
            {moveState.message}
          </span>
        )}
      </form>
    </>
  );
}
