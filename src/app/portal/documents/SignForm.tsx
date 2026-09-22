'use client';

import React, { useActionState, useState } from 'react';
import { signDocument, type SignState } from './actions';
import styles from '../Portal.module.css';
import forms from '@/styles/forms.module.css';

const INITIAL: SignState = { status: 'idle' };

/**
 * Signing.
 *
 * Nothing is pre-ticked and nothing is pre-filled. The two confirmations are
 * separate because they are two different agreements — this document, and the
 * standard terms — and collapsing them into one tick is how people end up
 * having agreed to something they never read.
 */
export function SignForm({
  requestId,
  termsTitle,
  termsVersion,
  signerName,
}: {
  requestId: string;
  termsTitle: string | null;
  termsVersion: number | null;
  signerName: string;
}) {
  const [state, action, pending] = useActionState(signDocument, INITIAL);
  const [initials, setInitials] = useState('');

  if (state.status === 'done') {
    return (
      <p className={styles.notice} role="status">
        {state.message}
      </p>
    );
  }

  return (
    <form action={action} className={forms.form}>
      <input type="hidden" name="requestId" value={requestId} />

      <div className={forms.field}>
        <label className={forms.label} htmlFor="initials">
          Your initials
        </label>
        <input
          id="initials"
          name="initials"
          className={forms.control}
          value={initials}
          onChange={(event) => setInitials(event.target.value)}
          maxLength={12}
          autoComplete="off"
          required
          disabled={pending}
          placeholder={signerName
            .split(' ')
            .map((part) => part[0])
            .join('')
            .slice(0, 4)
            .toUpperCase()}
        />
        <p className={forms.hint}>
          Typed by you, recorded against your name, your email and the time. That is what makes it
          a signature.
        </p>
      </div>

      <label className={forms.checkRow} htmlFor="accept-doc">
        <input
          id="accept-doc"
          name="acceptDocument"
          type="checkbox"
          className={forms.check}
          required
          disabled={pending}
        />
        <span className={forms.checkText}>
          <span>I have read this document and agree to it</span>
          <span className={forms.hint}>
            If anything is wrong, close this and email us instead. We would much rather fix it.
          </span>
        </span>
      </label>

      {termsTitle && (
        <label className={forms.checkRow} htmlFor="accept-terms">
          <input
            id="accept-terms"
            name="acceptTerms"
            type="checkbox"
            className={forms.check}
            required
            disabled={pending}
          />
          <span className={forms.checkText}>
            <span>
              I accept the {termsTitle}
              {termsVersion ? `, version ${termsVersion}` : ''}
            </span>
            <span className={forms.hint}>
              Shown in full below. The exact version you accept is recorded, so it cannot change
              afterwards.
            </span>
          </span>
        </label>
      )}

      <div className={forms.actions}>
        <button type="submit" className={forms.button} disabled={pending || initials.length === 0}>
          {pending ? 'Signing…' : 'Sign it'}
        </button>
        <p className={forms.payoff}>
          You will get a copy, and it stays in your portal.
        </p>
      </div>

      {state.status === 'error' && (
        <p className={forms.error} role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
