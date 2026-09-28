'use client';

import { useActionState, useState } from 'react';
import { removeMedia, type RemoveMediaState } from '@/app/admin/media/actions';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';

const INITIAL: RemoveMediaState = { status: 'idle' };

/** Removing an image from the website, behind a second press. */
export function RemoveImage({ mediaId, filename }: { mediaId: string; filename: string }) {
  const [state, action, pending] = useActionState(removeMedia, INITIAL);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" className={table.action} onClick={() => setOpen(true)}>
        Remove
      </button>
    );
  }

  return (
    <form action={action}>
      <input type="hidden" name="mediaId" value={mediaId} />
      <span className={table.actionGroup}>
        <span>Remove {filename}?</span>
        <button type="submit" className={`${forms.button} ${forms.danger}`} disabled={pending}>
          {pending ? 'Removing…' : 'Remove'}
        </button>
        <button
          type="button"
          className={`${forms.button} ${forms.quiet}`}
          onClick={() => setOpen(false)}
          disabled={pending}
        >
          Keep it
        </button>
      </span>
      {state.status === 'error' && state.message && (
        <p className={forms.error} role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
