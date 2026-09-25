'use client';

import React, { useActionState, useState } from 'react';
import { restoreClient } from '../../clients/actions';
import type { RemovalState } from '@/lib/console/confirm-name';
import forms from '@/styles/forms.module.css';

const INITIAL: RemovalState = { status: 'idle' };

/** Bringing a client back, after one question. */
export function RestoreClient({
  clientId,
  clientName,
  projects,
}: {
  clientId: string;
  clientName: string;
  /** Projects that come back with them. */
  projects: number;
}) {
  const [asking, setAsking] = useState(false);
  const [state, action, pending] = useActionState(restoreClient, INITIAL);

  if (!asking) {
    return (
      <button type="button" className={forms.button} onClick={() => setAsking(true)}>
        Bring back
      </button>
    );
  }

  return (
    <form action={action} className={forms.form}>
      <input type="hidden" name="clientId" value={clientId} />
      <p className={forms.hint}>
        Bring back {clientName}
        {projects > 0
          ? ` and ${projects === 1 ? 'the project' : `the ${projects} projects`} removed with them`
          : ''}
        ? Their people come back with portal access off.
      </p>
      <div className={forms.actions}>
        <button type="submit" className={forms.button} disabled={pending}>
          {pending ? 'Bringing back…' : 'Bring them back'}
        </button>
        <button
          type="button"
          className={`${forms.button} ${forms.quiet}`}
          onClick={() => setAsking(false)}
          disabled={pending}
        >
          Cancel
        </button>
      </div>
      {state.status === 'error' && (
        <p className={forms.error} role="status">
          {state.message}
        </p>
      )}
    </form>
  );
}
