'use client';

import React, { useActionState, useState } from 'react';
import { answerReview, type AnswerState } from './review-actions';
import { TextAreaField } from '@/components/console/Fields';
import forms from '@/styles/forms.module.css';
import styles from '@/components/console/Review.module.css';

const INITIAL: AnswerState = { status: 'idle' };

/** Approve, or say what should change. Two steps, so neither is a slip of the finger. */
export function ReviewAnswer({ reviewId }: { reviewId: string }) {
  const [choice, setChoice] = useState<'approve' | 'changes' | null>(null);
  const [state, action, pending] = useActionState(answerReview, INITIAL);

  if (state.status === 'done') {
    return (
      <p className={forms.hint} role="status" aria-live="polite">
        {state.message}
      </p>
    );
  }

  if (!choice) {
    return (
      <div className={styles.choices}>
        <button type="button" className={forms.button} onClick={() => setChoice('approve')}>
          Approve this version
        </button>
        <button
          type="button"
          className={`${forms.button} ${forms.quiet}`}
          onClick={() => setChoice('changes')}
        >
          Ask for changes
        </button>
      </div>
    );
  }

  const approving = choice === 'approve';
  return (
    <form action={action} className={forms.form}>
      <input type="hidden" name="reviewId" value={reviewId} />
      <input type="hidden" name="decision" value={choice} />
      <TextAreaField
        name="answer"
        label={approving ? 'Anything to add?' : 'What should change?'}
        optional={approving}
        required={!approving}
        rows={approving ? 3 : 6}
        maxLength={4000}
      />
      <div className={forms.actions}>
        <button type="submit" className={forms.button} disabled={pending}>
          {pending ? 'Sending…' : approving ? 'Approve' : 'Send the changes'}
        </button>
        <button
          type="button"
          className={`${forms.button} ${forms.quiet}`}
          onClick={() => setChoice(null)}
          disabled={pending}
        >
          Back
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
