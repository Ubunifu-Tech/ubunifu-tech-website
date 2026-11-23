'use client';

import { useActionState } from 'react';
import { resumeProjectHosting, type HostingState } from '@/app/admin/projects/[slug]/hosting-actions';
import forms from '@/styles/forms.module.css';

const INITIAL: HostingState = { status: 'idle' };

/** Resume, as one press, wherever the offer is made. Owners only; checked again on the server. */
export function ResumeHostingButton({ projectId }: { projectId: string }) {
  const [state, action, pending] = useActionState(resumeProjectHosting, INITIAL);
  return (
    <form action={action}>
      <input type="hidden" name="projectId" value={projectId} />
      <button type="submit" className={forms.button} disabled={pending}>
        {pending ? 'Resuming…' : 'Resume hosting'}
      </button>
      {state.message && (
        <p className={state.status === 'error' ? forms.error : forms.hint} role="status" aria-live="polite">
          {state.message}
        </p>
      )}
    </form>
  );
}
