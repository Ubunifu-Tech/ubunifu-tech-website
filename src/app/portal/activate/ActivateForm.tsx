'use client';

import React, { useActionState } from 'react';
import { activateAccount, type ActivateState } from './actions';
import styles from '../Portal.module.css';

const INITIAL: ActivateState = { status: 'idle' };

export function ActivateForm({ defaultName }: { defaultName: string }) {
  const [state, action, pending] = useActionState(activateAccount, INITIAL);

  return (
    <form action={action} className={styles.form}>
      <div className={styles.field}>
        <label htmlFor="name" className={styles.label}>Your name</label>
        <input
          id="name"
          name="name"
          type="text"
          defaultValue={defaultName}
          autoComplete="name"
          required
          disabled={pending}
          className={styles.input}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="phone" className={styles.label}>Phone or WhatsApp (optional)</label>
        <input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          disabled={pending}
          className={styles.input}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="password" className={styles.label}>Choose a password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          disabled={pending}
          className={styles.input}
        />
        <p className={styles.hint}>
          At least 12 characters. A short phrase you will remember beats a short
          password with symbols in it.
        </p>
      </div>

      <div className={styles.field}>
        <label htmlFor="confirm" className={styles.label}>Confirm password</label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          disabled={pending}
          className={styles.input}
        />
      </div>

      <button type="submit" className={styles.button} disabled={pending}>
        {pending ? 'Setting up…' : 'Finish setting up'}
      </button>

      {state.status === 'error' && (
        <p className={styles.formError} role="status" aria-live="polite">
          {state.message}
        </p>
      )}
    </form>
  );
}
