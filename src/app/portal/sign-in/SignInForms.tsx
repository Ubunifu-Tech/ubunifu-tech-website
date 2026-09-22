'use client';

import React, { useActionState, useState } from 'react';
import {
  requestPortalLink,
  signInWithPassword,
  type PortalSignInState,
} from './actions';
import styles from '../Portal.module.css';
import forms from '@/styles/forms.module.css';

const INITIAL: PortalSignInState = { status: 'idle' };

export function SignInForms() {
  const [mode, setMode] = useState<'password' | 'link'>('password');
  const [pwState, pwAction, pwPending] = useActionState(signInWithPassword, INITIAL);
  const [linkState, linkAction, linkPending] = useActionState(requestPortalLink, INITIAL);

  if (mode === 'link') {
    const waiting = linkPending || linkState.status === 'sent';
    return (
      <form action={linkAction} className={forms.form}>
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
          {linkState.message ?? 'We will email a link that signs you in without a password.'}
        </p>

        {linkState.status !== 'sent' && (
          <div className={styles.divider}>
            <button type="button" className={forms.link} onClick={() => setMode('password')}>
              Sign in with a password instead
            </button>
          </div>
        )}
      </form>
    );
  }

  return (
    <form action={pwAction} className={forms.form}>
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

      {/* Doubles as password recovery: there is no separate reset flow, because
          a link already proves the same thing a reset email would. */}
      <div className={styles.divider}>
        <button type="button" className={forms.link} onClick={() => setMode('link')}>
          Forgotten your password? Email me a sign-in link
        </button>
      </div>
    </form>
  );
}
