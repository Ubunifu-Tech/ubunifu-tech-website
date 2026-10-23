'use client';

import { useActionState, useState } from 'react';
import { requestStaffLink, type SignInState } from './actions';
import forms from '@/styles/forms.module.css';
import auth from '@/styles/auth.module.css';

const INITIAL: SignInState = { status: 'idle' };

export function SignInForm({ next }: { next?: string | null }) {
  const [state, action, pending] = useActionState(requestStaffLink, INITIAL);
  // Held here so the address is still in the field after sending, ready to
  // send again.
  const [email, setEmail] = useState('');

  return (
    <form action={action} className={forms.form}>
      {next && <input type="hidden" name="next" value={next} />}
      <div className={forms.field}>
        <label htmlFor="email" className={forms.label}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          autoFocus
          required
          disabled={pending}
          className={forms.control}
          placeholder="you@ubunifutech.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <button type="submit" className={forms.button} disabled={pending}>
        {pending ? 'Sending…' : state.status === 'sent' ? 'Send again' : 'Email me a link'}
      </button>

      {/* One live region for both outcomes, so a screen reader announces the
          result rather than the user wondering whether anything happened. */}
      <p className={state.status === 'error' ? forms.error : auth.status} role="status" aria-live="polite">
        {state.message}
      </p>
    </form>
  );
}
