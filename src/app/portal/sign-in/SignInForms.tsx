'use client';

import React, { useActionState, useState } from 'react';
import {
  requestPasswordReset,
  requestPortalLink,
  signInWithPassword,
  type PortalSignInState,
} from './actions';
import styles from '../Portal.module.css';
import forms from '@/styles/forms.module.css';

const INITIAL: PortalSignInState = { status: 'idle' };

type Mode = 'password' | 'link' | 'reset';

export function SignInForms({
  next,
  startWith = 'password',
}: {
  next?: string | null;
  startWith?: Mode;
}) {
  const [mode, setMode] = useState<Mode>(startWith);
  const [pwState, pwAction, pwPending] = useActionState(signInWithPassword, INITIAL);
  const [linkState, linkAction, linkPending] = useActionState(requestPortalLink, INITIAL);
  const [resetState, resetAction, resetPending] = useActionState(requestPasswordReset, INITIAL);

  if (mode === 'reset') {
    const waiting = resetPending || resetState.status === 'sent';
    return (
      <form action={resetAction} className={forms.form}>
        <div className={forms.field}>
          <label htmlFor="reset-email" className={forms.label}>
            Email
          </label>
          <input
            id="reset-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={waiting}
            className={forms.control}
          />
        </div>

        <button type="submit" className={forms.button} disabled={waiting}>
          {resetPending ? 'Sending…' : 'Email me a reset link'}
        </button>

        <p
          className={resetState.status === 'error' ? forms.error : forms.hint}
          role="status"
          aria-live="polite"
        >
          {resetState.message ?? 'We will email you a link to choose a new password.'}
        </p>

        <div className={styles.divider}>
          <button type="button" className={forms.link} onClick={() => setMode('password')}>
            Back to sign in
          </button>
        </div>
      </form>
    );
  }

  if (mode === 'link') {
    const waiting = linkPending || linkState.status === 'sent';
    return (
      <form action={linkAction} className={forms.form}>
        {next && <input type="hidden" name="next" value={next} />}
        <div className={forms.field}>
          <label htmlFor="link-email" className={forms.label}>
            Email
          </label>
          <input
            id="link-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={waiting}
            className={forms.control}
          />
        </div>

        <button type="submit" className={forms.button} disabled={waiting}>
          {linkPending ? 'Sending…' : 'Email me a link'}
        </button>

        <p
          className={linkState.status === 'error' ? forms.error : forms.hint}
          role="status"
          aria-live="polite"
        >
          {linkState.message ?? 'We will email you a link to sign in.'}
        </p>

        {linkState.status !== 'sent' && (
          <div className={styles.divider}>
            <button type="button" className={forms.link} onClick={() => setMode('password')}>
              Use a password instead
            </button>
          </div>
        )}
      </form>
    );
  }

  return (
    <form action={pwAction} className={forms.form}>
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
          required
          disabled={pwPending}
          className={forms.control}
        />
      </div>

      <div className={forms.field}>
        <label htmlFor="password" className={forms.label}>
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={pwPending}
          className={forms.control}
        />
      </div>

      <button type="submit" className={forms.button} disabled={pwPending}>
        {pwPending ? 'Signing in…' : 'Sign in'}
      </button>

      {pwState.status === 'error' && (
        <p className={forms.error} role="status" aria-live="polite">
          {pwState.message}
        </p>
      )}

      <div className={styles.divider}>
        <button type="button" className={forms.link} onClick={() => setMode('reset')}>
          Forgot your password?
        </button>
        <button type="button" className={forms.link} onClick={() => setMode('link')}>
          Email me a sign-in link
        </button>
      </div>
    </form>
  );
}
