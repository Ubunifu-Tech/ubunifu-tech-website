'use client';

import { useActionState, useState } from 'react';
import { answerRequest, type AnswerState } from './actions';
import forms from '@/styles/forms.module.css';
import styles from '../../Portal.module.css';

const INITIAL: AnswerState = { status: 'idle' };

/**
 * Writing the answer instead of attaching a file: a bio, a mission, which of
 * two domains. An answer already sent is shown, with a way to change it.
 */
export function AnswerBox({
  assetRequestId,
  response,
}: {
  assetRequestId: string;
  response: string | null;
}) {
  const [state, action, pending] = useActionState(answerRequest, INITIAL);
  const [editing, setEditing] = useState(!response);
  const [text, setText] = useState(response ?? '');

  // A saved answer closes the box, the first time each answer is seen.
  const [answered, setAnswered] = useState(state);
  if (state !== answered) {
    setAnswered(state);
    if (state.status === 'done') setEditing(false);
  }

  if (!editing && text) {
    return (
      <div className={styles.answer}>
        <p className={styles.answerText}>{text}</p>
        <button type="button" className={forms.link} onClick={() => setEditing(true)}>
          Change your answer
        </button>
        {state.status === 'done' && (
          <p className={forms.hint} role="status">
            {state.message}
          </p>
        )}
      </div>
    );
  }

  return (
    <form action={action} className={styles.answer}>
      <input type="hidden" name="assetRequestId" value={assetRequestId} />
      <textarea
        name="response"
        className={`${forms.control} ${forms.textarea}`}
        value={text}
        onChange={(event) => setText(event.target.value)}
        maxLength={8000}
        rows={4}
        placeholder="Write it here, or attach a file below."
        aria-label="Your answer"
      />
      <div className={styles.answerActions}>
        <button type="submit" className={`${forms.button} ${forms.quiet}`} disabled={pending || !text.trim()}>
          {pending ? 'Sending…' : response ? 'Save the change' : 'Send your answer'}
        </button>
        {response && (
          <button
            type="button"
            className={forms.link}
            onClick={() => {
              setText(response);
              setEditing(false);
            }}
          >
            Keep what I sent
          </button>
        )}
      </div>
      {state.status === 'error' && (
        <p className={forms.error} role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
