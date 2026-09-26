'use client';

import { useActionState } from 'react';
import { restoreProject, type RestoreState } from '../../projects/[slug]/remove-actions';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';

const INITIAL: RestoreState = { status: 'idle' };

/** Brings a removed project back, and opens it. */
export function RestoreProject({ projectId }: { projectId: string }) {
  const [state, action, pending] = useActionState(restoreProject, INITIAL);
  return (
    <form action={action} className={table.actionGroup}>
      <input type="hidden" name="projectId" value={projectId} />
      {state.status === 'error' && <span className={forms.error}>{state.message}</span>}
      <button type="submit" className={table.action} disabled={pending}>
        {pending ? 'Bringing back…' : 'Bring back'}
      </button>
    </form>
  );
}
