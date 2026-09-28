'use client';

import { useActionState, useState } from 'react';
import { bringBackContact, type InviteState } from '../actions';
import { TextField } from '@/components/console/Fields';
import { RowMenu } from '@/components/console/RowMenu';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';

const INITIAL: InviteState = { status: 'idle' };

/**
 * Brings a removed person back to the client. When their old address now
 * belongs to someone at another client, they come back under a new one,
 * typed here.
 */
export function BringBack({
  clientId,
  contactId,
  name,
  needsNewEmail = false,
}: {
  clientId: string;
  contactId: string;
  name: string;
  /** Their old address is in use at another client. */
  needsNewEmail?: boolean;
}) {
  const [state, action, pending] = useActionState(bringBackContact, INITIAL);
  const [email, setEmail] = useState('');

  if (needsNewEmail) {
    return (
      <RowMenu
        label={`Bring ${name} back with a new email`}
        text="Bring back with a new email"
        triggerClassName={table.action}
        wide
      >
        <form action={action} className={forms.form}>
          <input type="hidden" name="clientId" value={clientId} />
          <input type="hidden" name="contactId" value={contactId} />
          <TextField
            name="email"
            type="email"
            label="Their new email"
            hint="Their old address belongs to someone at another client now."
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            maxLength={254}
            required
            autoFocus
          />
          <div className={forms.actions}>
            <button type="submit" className={forms.button} disabled={pending}>
              {pending ? 'Bringing back…' : 'Bring back'}
            </button>
          </div>
          {state.status === 'error' && (
            <p className={forms.error} role="alert">
              {state.message}
            </p>
          )}
        </form>
      </RowMenu>
    );
  }

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
