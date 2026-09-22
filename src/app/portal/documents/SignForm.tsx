'use client';

import React, { useActionState, useState } from 'react';
import { respondToDocument, signDocument, type SignState } from './actions';
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
            If anything is wrong, do not sign it — ask for changes below. We would much rather fix
            it.
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

type Intent = 'changes' | 'decline';

const WORDING: Record<
  Intent,
  { open: string; title: string; hint: string; submit: string; working: string }
> = {
  changes: {
    open: 'Ask for changes',
    title: 'What should change?',
    hint: 'We will read it, make the changes and send you a new version to sign. This one stays here in the meantime, so you can still sign it if we talk it through.',
    submit: 'Send it to us',
    working: 'Sending…',
  },
  decline: {
    open: 'I cannot sign this',
    title: 'Why not?',
    hint: 'This closes the request. Nothing is signed, nothing is charged, and we will come back to you — a new version would arrive as a fresh request.',
    submit: 'Decline it',
    working: 'Recording…',
  },
};

/**
 * The other two answers.
 *
 * Kept off the signing form and behind a press each, so neither is something
 * you can hit by accident while reaching for the button that matters — but
 * both are on the page, because a page that only lets you say yes is not
 * asking anything.
 */
export function RespondForm({ requestId }: { requestId: string }) {
  const [state, action, pending] = useActionState(respondToDocument, INITIAL);
  const [intent, setIntent] = useState<Intent | null>(null);
  // Controlled, so a rejected submission does not hand back an empty box.
  // React resets an uncontrolled form once the action returns, and asking
  // somebody to retype the reason they cannot sign is how you stop hearing it.
  const [note, setNote] = useState('');

  if (state.status === 'done') {
    return (
      <p className={styles.notice} role="status">
        {state.message}
      </p>
    );
  }

  if (!intent) {
    return (
      <div className={forms.actions}>
        <button
          type="button"
          className={`${forms.button} ${forms.quiet}`}
          onClick={() => setIntent('changes')}
        >
          {WORDING.changes.open}
        </button>
        <button
          type="button"
          className={`${forms.button} ${forms.quiet}`}
          onClick={() => setIntent('decline')}
        >
          {WORDING.decline.open}
        </button>
      </div>
    );
  }

  const wording = WORDING[intent];

  return (
    <form action={action} className={forms.form}>
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="intent" value={intent} />

      <div className={forms.field}>
        <label className={forms.label} htmlFor="respond-note">
          {wording.title}
        </label>
        <textarea
          id="respond-note"
          name="note"
          className={forms.control}
          rows={5}
          minLength={10}
          maxLength={4000}
          required
          disabled={pending}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <p className={forms.hint}>{wording.hint}</p>
      </div>

      <div className={forms.actions}>
        <button
          type="submit"
          className={`${forms.button} ${intent === 'decline' ? forms.danger : ''}`}
          disabled={pending}
        >
          {pending ? wording.working : wording.submit}
        </button>
        <button
          type="button"
          className={`${forms.button} ${forms.quiet}`}
          onClick={() => setIntent(null)}
          disabled={pending}
        >
          Back
        </button>
      </div>

      {state.status === 'error' && (
        <p className={forms.error} role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
