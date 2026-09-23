'use client';

import React, { useActionState } from 'react';
import { activateAccount, type ActivateState } from './actions';
import forms from '@/styles/forms.module.css';

const INITIAL: ActivateState = { status: 'idle' };

export function ActivateForm({
  defaultName,
  email,
  defaultPhone,
}: {
  defaultName: string;
  /** Known already, or null when they are giving it now. */
  email: string | null;
  defaultPhone: string;
}) {
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
          {/* A label only when there is a field to fill in; a known address
              is plain text, and a label pointing at it would name nothing. */}
          {email ? (
            <>
              <span className={forms.label}>Email</span>
              <p className={forms.hint}>You will sign in with {email}.</p>
            </>
          ) : (
            <>
              <label htmlFor="email" className={forms.label}>
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                disabled={pending}
                className={forms.control}
              />
            </>
          )}
        </div>

        <div className={forms.field}>
          <label htmlFor="phone" className={forms.label}>
            Phone <span className={forms.optional}>(optional)</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            defaultValue={defaultPhone}
            maxLength={40}
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
          At least 12 characters.
        </p>
      </div>

      <div className={forms.actions}>
        <button type="submit" className={forms.button} disabled={pending}>
          {pending ? 'Setting up…' : 'Finish setting up'}
        </button>
      </div>

      {state.status === 'error' && (
        <p className={forms.error} role="status" aria-live="polite">
          {state.message}
        </p>
      )}
    </form>
  );
}
