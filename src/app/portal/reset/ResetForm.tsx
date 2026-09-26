'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { resetPassword, type ResetState } from './actions';
import forms from '@/styles/forms.module.css';

const INITIAL: ResetState = { status: 'idle' };

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPassword, INITIAL);

  if (state.expired) {
    return (
      <div className={forms.form}>
        <p className={forms.error} role="status">
          {state.message}
        </p>
        <Link href="/portal/sign-in?error=reset-expired" className={forms.button}>
          Get a new link
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className={forms.form}>
      <input type="hidden" name="token" value={token} />
      <div className={forms.field}>
        <label htmlFor="password" className={forms.label}>
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          disabled={pending}
          className={forms.control}
        />
      </div>

      <div className={forms.field}>
        <label htmlFor="confirm" className={forms.label}>
          Confirm new password
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          disabled={pending}
          className={forms.control}
        />
        <p className={forms.hint}>At least 12 characters.</p>
      </div>

      <button type="submit" className={forms.button} disabled={pending}>
        {pending ? 'Saving…' : 'Save and sign in'}
      </button>

      {state.status === 'error' && (
        <p className={forms.error} role="status" aria-live="polite">
          {state.message}
        </p>
      )}
    </form>
  );
}
