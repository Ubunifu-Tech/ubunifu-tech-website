'use client';

import { useActionState, useState } from 'react';
import { removeMyFile, type UploadState } from './actions';
import forms from '@/styles/forms.module.css';
import styles from './RemoveFile.module.css';

const IDLE: UploadState = { status: 'idle' };

/** Takes back a file sent by mistake, asked once before it goes. */
export function RemoveFile({ fileId, filename }: { fileId: string; filename: string }) {
  const [asking, setAsking] = useState(false);
  const [state, action, pending] = useActionState(removeMyFile, IDLE);

  if (!asking) {
    return (
      <button
        type="button"
        className={forms.link}
        onClick={() => setAsking(true)}
        aria-label={`Remove ${filename}`}
      >
        Remove
      </button>
    );
  }

  return (
    <form action={action} className={styles.confirm}>
      <input type="hidden" name="fileId" value={fileId} />
      <span className={styles.question}>{`Remove ${filename}?`}</span>
      <button type="submit" className={`${forms.button} ${forms.danger}`} disabled={pending}>
        {pending ? 'Removing…' : 'Remove'}
      </button>
      <button
        type="button"
        className={`${forms.button} ${forms.quiet}`}
        onClick={() => setAsking(false)}
        disabled={pending}
      >
        Keep it
      </button>
      {state.status === 'error' && (
        <p className={forms.error} role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
