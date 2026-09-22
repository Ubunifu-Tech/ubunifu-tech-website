'use client';

import React, { useActionState } from 'react';
import { requestStaffLink, type SignInState } from './actions';
import forms from '@/styles/forms.module.css';

const INITIAL: SignInState = { status: 'idle' };

export function SignInForm() {
  const [state, action, pending] = useActionState(requestStaffLink, INITIAL);
  const waiting = pending || state.status === 'sent';

  return (
    <form action={action} className={forms.form}>
      <div className={forms.field}>
        <label htmlFor="email" className={forms.label}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={waiting}
          className={forms.control}
          placeholder="you@ubunifutech.com"
        />
      </div>

      <button type="submit" className={forms.button} disabled={waiting}>
        {pending ? 'Sending…' : 'Email me a link'}
      </button>

      {/* One live region for both outcomes, so a screen reader announces the
          result rather than the user wondering whether anything happened. */}
      <p
        className={state.status === 'error' ? forms.error : forms.hint}
        role="status"
        aria-live="polite"
      >
        {state.message ?? 'We will email you a link to sign in.'}
      </p>
    </form>
  );
}
