'use client';

import { useActionState } from 'react';
import { restorePost, type PostState } from './actions';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';

const INITIAL: PostState = { status: 'idle' };

/** Brings an archived post back as a draft and opens it in the editor. */
export function RestorePost({ postId }: { postId: string }) {
  const [state, action, pending] = useActionState(restorePost, INITIAL);

  return (
    <form action={action}>
      <input type="hidden" name="postId" value={postId} />
      <button type="submit" className={table.action} disabled={pending}>
        {pending ? 'Bringing back…' : 'Bring back'}
      </button>
      {state.status === 'error' && state.message && (
        <p className={forms.error} role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
