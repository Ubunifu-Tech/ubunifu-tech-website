'use client';

import React, { useActionState } from 'react';
import { inviteContact, type InviteState } from './actions';
import styles from '../Admin.module.css';
import forms from '@/styles/forms.module.css';

const INITIAL: InviteState = { status: 'idle' };

export function InviteButton({
  contactId,
  activated,
}: {
  contactId: string;
  activated: boolean;
}) {
  const [state, action, pending] = useActionState(inviteContact, INITIAL);

  return (
    <form action={action} className={styles.inlineForm}>
      <input type="hidden" name="contactId" value={contactId} />
      <button type="submit" className={forms.link} disabled={pending}>
        {pending ? 'Sending…' : activated ? 'Send sign-in link' : 'Send invitation'}
      </button>
      {state.message && (
        <span
          className={state.status === 'error' ? forms.error : forms.hint}
          role="status"
          aria-live="polite"
        >
          {state.message}
        </span>
      )}
    </form>
  );
}
