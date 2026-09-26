'use client';

import React, { useActionState, useState } from 'react';
import {
  removeEnquiry,
  reopenEnquiry,
  restoreEnquiry,
  saveEnquiryNote,
  setEnquiryServiceLine,
  setEnquiryStatus,
  type TriageState,
} from './actions';
import styles from '../Admin.module.css';
import forms from '@/styles/forms.module.css';
import { Select } from '@/components/console/Select';
import { SERVICE_LINES } from '@/lib/console/project-status';

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
  serviceLine,
  clientRemoved = false,
  removed = false,
}: {
  id: string;
  status: string;
  note: string | null;
  serviceLine: string | null;
  /** It became a client that has since been removed. */
  clientRemoved?: boolean;
  /** Taken out of the lists; it can only be brought back. */
  removed?: boolean;
}) {
  const [moveState, moveAction, movePending] = useActionState(setEnquiryStatus, INITIAL);
  const [noteState, noteAction, notePending] = useActionState(saveEnquiryNote, INITIAL);
  const [lineState, lineAction, linePending] = useActionState(setEnquiryServiceLine, INITIAL);
  const converted = status === 'converted';

  if (removed) return <RestoreEnquiry id={id} />;

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

      {!converted && (
        <form action={lineAction} className={styles.inlineForm}>
          <input type="hidden" name="id" value={id} />
          <label className={forms.label} htmlFor={`line-${id}`}>
            What the work is
          </label>
          <Select
            id={`line-${id}`}
            name="serviceLine"
            defaultValue={serviceLine ?? undefined}
            placeholder="Not decided"
            options={SERVICE_LINES}
            disabled={linePending}
          />
          <button type="submit" className={`${forms.button} ${forms.quiet}`} disabled={linePending}>
            {linePending ? 'Saving…' : 'Save'}
          </button>
          {lineState.message && (
            <span
              className={lineState.status === 'error' ? forms.error : forms.hint}
              role="status"
              aria-live="polite"
            >
              {lineState.message}
            </span>
          )}
        </form>
      )}

      {!converted && (
        <form action={moveAction} className={styles.inlineForm}>
          <input type="hidden" name="id" value={id} />
          <label className={forms.label} htmlFor={`status-${id}`}>
            Where it stands
          </label>
          <Select
            id={`status-${id}`}
            name="status"
            defaultValue={status}
            options={MOVES}
            disabled={movePending}
          />
          <button type="submit" className={`${forms.button} ${forms.quiet}`} disabled={movePending}>
            {movePending ? 'Saving…' : 'Update'}
          </button>
          {moveState.status === 'error' && (
            <span className={forms.error} role="status" aria-live="polite">
              {moveState.message}
            </span>
          )}
        </form>
      )}

      {converted && clientRemoved && <ReopenEnquiry id={id} />}

      <RemoveEnquiry id={id} />
    </>
  );
}

/** A converted enquiry whose client was removed, opened again to onboard properly. */
function ReopenEnquiry({ id }: { id: string }) {
  const [state, action, pending] = useActionState(reopenEnquiry, INITIAL);
  return (
    <form action={action} className={styles.inlineForm}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className={`${forms.button} ${forms.quiet}`} disabled={pending}>
        {pending ? 'Opening…' : 'Open it again'}
      </button>
      <span className={forms.hint}>The client it became was removed.</span>
      {state.status === 'error' && (
        <span className={forms.error} role="status" aria-live="polite">
          {state.message}
        </span>
      )}
    </form>
  );
}

/** A removed enquiry, brought back into the lists. */
function RestoreEnquiry({ id }: { id: string }) {
  const [state, action, pending] = useActionState(restoreEnquiry, INITIAL);
  return (
    <form action={action} className={styles.inlineForm}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className={forms.button} disabled={pending}>
        {pending ? 'Bringing it back…' : 'Bring it back'}
      </button>
      <span className={forms.hint}>It was removed from the lists. Nothing was sent to them.</span>
      {state.status === 'error' && (
        <span className={forms.error} role="status" aria-live="polite">
          {state.message}
        </span>
      )}
    </form>
  );
}

/** Taking an enquiry out of the console, behind a second press. */
function RemoveEnquiry({ id }: { id: string }) {
  const [state, action, pending] = useActionState(removeEnquiry, INITIAL);
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <div className={styles.inlineForm}>
        <button type="button" className={forms.link} onClick={() => setConfirming(true)}>
          Remove this enquiry
        </button>
      </div>
    );
  }

  return (
    <form action={action} className={styles.inlineForm}>
      <input type="hidden" name="id" value={id} />
      <span className={forms.hint}>It leaves every list and count. Nothing is sent to them.</span>
      <button type="submit" className={`${forms.button} ${forms.danger}`} disabled={pending}>
        {pending ? 'Removing…' : 'Remove'}
      </button>
      <button
        type="button"
        className={`${forms.button} ${forms.quiet}`}
        onClick={() => setConfirming(false)}
        disabled={pending}
      >
        Keep
      </button>
      {state.status === 'error' && (
        <span className={forms.error} role="status" aria-live="polite">
          {state.message}
        </span>
      )}
    </form>
  );
}
