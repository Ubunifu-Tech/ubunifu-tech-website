'use client';

import React, { useActionState } from 'react';
import { requestStaffLink, type SignInState } from './actions';
import styles from '../Admin.module.css';

const INITIAL: SignInState = { status: 'idle' };

export function SignInForm() {
  const [state, action, pending] = useActionState(requestStaffLink, INITIAL);

  return (
    <form action={action} className={styles.form}>
      <label htmlFor="email" className={styles.label}>
        Work email
      </label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        disabled={pending || state.status === 'sent'}
        className={styles.input}
        placeholder="you@ubunifutech.com"
      />

      <button type="submit" className={styles.button} disabled={pending || state.status === 'sent'}>
        {pending ? 'Sending…' : 'Email me a link'}
      </button>

      {/* One live region for both outcomes, so a screen reader announces the
          result rather than the user wondering whether anything happened. */}
      <p
        className={state.status === 'error' ? styles.formError : styles.formNote}
        role="status"
        aria-live="polite"
      >
        {state.message ?? 'Access is by emailed link. The link works once and expires in 20 minutes.'}
      </p>
    </form>
  );
}
