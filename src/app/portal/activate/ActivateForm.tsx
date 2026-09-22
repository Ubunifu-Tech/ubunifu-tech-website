'use client';

import React, { useActionState } from 'react';
import { activateAccount, type ActivateState } from './actions';
import forms from '@/styles/forms.module.css';

const INITIAL: ActivateState = { status: 'idle' };

export function ActivateForm({ defaultName }: { defaultName: string }) {
  const [state, action, pending] = useActionState(activateAccount, INITIAL);

  return (
    <form action={action} className={forms.form}>
      <div className={forms.grid}>
        <div className={forms.field}>
          <label htmlFor="name" className={forms.label}>
            Your name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            defaultValue={defaultName}
            autoComplete="name"
            required
            disabled={pending}
            className={forms.control}
          />
        </div>

        <div className={forms.field}>
          <label htmlFor="phone" className={forms.label}>
            Phone or WhatsApp <span className={forms.optional}>(optional)</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            disabled={pending}
            className={forms.control}
          />
        </div>

        <div className={forms.field}>
          <label htmlFor="password" className={forms.label}>
            Choose a password
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
            Confirm password
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
        </div>

        <p className={`${forms.hint} ${forms.wide}`}>
          At least 12 characters. A short phrase you will remember beats a short password with
          symbols in it.
        </p>
      </div>

      <div className={forms.actions}>
        <button type="submit" className={forms.button} disabled={pending}>
          {pending ? 'Setting up…' : 'Finish setting up'}
        </button>
        <p className={forms.payoff}>
          After this you can sign in whenever you like, without waiting for an email.
        </p>
      </div>

      {state.status === 'error' && (
        <p className={forms.error} role="status" aria-live="polite">
          {state.message}
        </p>
      )}
    </form>
  );
}
