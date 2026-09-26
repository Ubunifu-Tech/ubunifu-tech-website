'use client';

import { useActionState, useState } from 'react';
import { askForReview, type ReviewState } from './review-actions';
import { TextAreaField, TextField } from '@/components/console/Fields';
import forms from '@/styles/forms.module.css';

const INITIAL: ReviewState = { status: 'idle' };

export function AskForReview({
  projectId,
  first,
  replacing,
}: {
  projectId: string;
  /** No round has been sent yet, so this is the main thing to do here. */
  first: boolean;
  /** The round still waiting on the client, which a new one takes back. */
  replacing: number | null;
}) {
  const [open, setOpen] = useState(false);
  // Closes itself inside the action, once the round is sent.
  const [state, action, pending] = useActionState(
    async (previous: ReviewState, formData: FormData) => {
      const result = await askForReview(previous, formData);
      if (result.status === 'done') setOpen(false);
      return result;
    },
    INITIAL,
  );

  if (!open) {
    return (
      <div className={forms.actions}>
        <button
          type="button"
          className={first ? forms.button : `${forms.button} ${forms.quiet}`}
          onClick={() => setOpen(true)}
        >
          {first ? 'Ask for a review' : 'Ask for another review'}
        </button>
        {state.message && (
          <p
            className={state.status === 'error' || state.unsent ? forms.error : forms.hint}
            role="status"
            aria-live="polite"
          >
            {state.message}
          </p>
        )}
      </div>
    );
  }

  return (
    <form action={action} className={forms.form}>
      <input type="hidden" name="projectId" value={projectId} />
      <TextField
        name="title"
        label="What they are looking at"
        required
        maxLength={160}
        placeholder="The home and about pages"
      />
      <TextField
        name="previewUrl"
        label="Preview link"
        type="url"
        optional
        placeholder="https://"
      />
      <TextAreaField name="note" label="What to look for" optional rows={4} maxLength={4000} />
      {replacing !== null && (
        <p className={forms.hint}>This replaces round {replacing}, which they have not answered.</p>
      )}
      <div className={forms.actions}>
        <button type="submit" className={forms.button} disabled={pending}>
          {pending ? 'Sending…' : 'Send for review'}
        </button>
        <button
          type="button"
          className={`${forms.button} ${forms.quiet}`}
          onClick={() => setOpen(false)}
          disabled={pending}
        >
          Cancel
        </button>
      </div>
      {state.status === 'error' && (
        <p className={forms.error} role="status" aria-live="polite">
          {state.message}
        </p>
      )}
    </form>
  );
}
