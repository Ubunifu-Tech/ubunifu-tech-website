'use client';

import React, { useActionState, useState } from 'react';
import {
  requestPortalLink,
  signInWithPassword,
  type PortalSignInState,
} from './actions';
import styles from '../Portal.module.css';

const INITIAL: PortalSignInState = { status: 'idle' };

export function SignInForms() {
  const [mode, setMode] = useState<'password' | 'link'>('password');
  const [pwState, pwAction, pwPending] = useActionState(signInWithPassword, INITIAL);
  const [linkState, linkAction, linkPending] = useActionState(requestPortalLink, INITIAL);

  if (mode === 'link') {
    return (
      <form action={linkAction} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="link-email" className={styles.label}>Email</label>
          <input
            id="link-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={linkPending || linkState.status === 'sent'}
            className={styles.input}
          />
        </div>

        <button
          type="submit"
          className={styles.button}
          disabled={linkPending || linkState.status === 'sent'}
        >
          {linkPending ? 'Sending…' : 'Email me a link'}
        </button>

        <p
          className={linkState.status === 'error' ? styles.formError : styles.formNote}
          role="status"
          aria-live="polite"
        >
          {linkState.message ?? 'We will email a link that signs you in without a password.'}
        </p>

        {linkState.status !== 'sent' && (
          <button type="button" className={styles.linkButton} onClick={() => setMode('password')}>
            Sign in with a password instead
          </button>
        )}
      </form>
    );
  }

  return (
    <form action={pwAction} className={styles.form}>
      <div className={styles.field}>
        <label htmlFor="email" className={styles.label}>Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={pwPending}
          className={styles.input}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="password" className={styles.label}>Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={pwPending}
          className={styles.input}
        />
      </div>

      <button type="submit" className={styles.button} disabled={pwPending}>
        {pwPending ? 'Signing in…' : 'Sign in'}
      </button>

      {pwState.status === 'error' && (
        <p className={styles.formError} role="status" aria-live="polite">
          {pwState.message}
        </p>
      )}

      {/* Doubles as password recovery: there is no separate reset flow, because
          a link already proves the same thing a reset email would. */}
      <button type="button" className={styles.linkButton} onClick={() => setMode('link')}>
        Forgotten your password? Email me a sign-in link
      </button>
    </form>
  );
}
