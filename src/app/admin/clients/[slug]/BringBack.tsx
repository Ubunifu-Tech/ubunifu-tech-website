'use client';

import { useActionState } from 'react';
import { bringBackContact, type InviteState } from '../actions';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';

const INITIAL: InviteState = { status: 'idle' };

/** Brings a removed person back to the client. */
export function BringBack({ clientId, contactId }: { clientId: string; contactId: string }) {
  const [state, action, pending] = useActionState(bringBackContact, INITIAL);
  return (
    <form action={action} className={table.actionGroup}>
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="contactId" value={contactId} />
      {state.status === 'error' && <span className={forms.error}>{state.message}</span>}
      <button type="submit" className={table.action} disabled={pending}>
        {pending ? 'Bringing back…' : 'Bring back'}
      </button>
    </form>
  );
}
