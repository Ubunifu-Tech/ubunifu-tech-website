'use client';

import React, { useActionState, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { draftWithAi, saveVersion, sendForSignature, type DocumentState } from './actions';
import styles from '../Admin.module.css';
import forms from '@/styles/forms.module.css';

const INITIAL: DocumentState = { status: 'idle' };

function Result({ state }: { state: DocumentState }) {
  if (!state.message) return null;
  return (
    <p
      className={state.status === 'error' ? forms.error : forms.hint}
      role="status"
      aria-live="polite"
    >
      {state.message}
    </p>
  );
}

/**
 * The copilot.
 *
 * Deliberately a button beside the editor rather than something that types
 * into it as you go. A draft arrives as a version you read, keep or throw
 * away — it never edits what is already there, and it cannot send anything.
 */
export function DraftWithAi({ documentId }: { documentId: string }) {
  const [state, action, pending] = useActionState(draftWithAi, INITIAL);

  return (
    <form action={action} className={forms.form}>
      <input type="hidden" name="documentId" value={documentId} />
      <div className={forms.field}>
        <label className={forms.label} htmlFor="ai-instruction">
          Anything it should know <span className={forms.optional}>(optional)</span>
        </label>
        <textarea
          id="ai-instruction"
          name="instruction"
          className={`${forms.control} ${forms.textarea}`}
          maxLength={2000}
          placeholder="Two-stage payment, and they want the domain in their own name."
          disabled={pending}
        />
        <p className={forms.hint}>
          It already has the project&rsquo;s fees, plan, dates and everything we have asked them
          for. This is for what is not written down anywhere.
        </p>
      </div>
      <div className={forms.actions}>
        <button type="submit" className={`${forms.button} ${forms.quiet}`} disabled={pending}>
          <Sparkles size={15} strokeWidth={1.8} aria-hidden="true" />
          {pending ? 'Drafting…' : 'Draft it for me'}
        </button>
        <p className={forms.payoff}>
          Arrives as a new version you can edit or discard. It never sends anything, and anything
          it had to guess is marked TO CONFIRM.
        </p>
      </div>
      <Result state={state} />
    </form>
  );
}

export function VersionEditor({
  documentId,
  body,
  locked,
}: {
  documentId: string;
  body: string;
  locked: boolean;
}) {
  const [state, action, pending] = useActionState(saveVersion, INITIAL);
  const [draft, setDraft] = useState(body);
  const hasMarkers = draft.includes('[TO CONFIRM');

  if (locked) {
    return (
      <p className={styles.note}>
        This document has been signed. It cannot be edited — a signed document is a record of what
        two people agreed to, and rewriting it afterwards would make that record a lie. Start a
        change order instead.
      </p>
    );
  }

  return (
    <form action={action} className={forms.form}>
      <input type="hidden" name="documentId" value={documentId} />
      <div className={forms.field}>
        <label className={forms.label} htmlFor="doc-body">
          The document
        </label>
        <textarea
          id="doc-body"
          name="body"
          className={`${forms.control} ${forms.editor}`}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={pending}
          spellCheck
        />
        <p className={forms.hint}>
          Markdown: ## for a heading, - for a bullet, **bold**. Nothing else renders, on purpose.
        </p>
      </div>

      {hasMarkers && (
        <ul className={styles.warnList}>
          <li className={styles.warnItem}>
            This still contains TO CONFIRM markers. They are places the assistant needed something
            it did not have. It will not send while they are there.
          </li>
        </ul>
      )}

      <div className={forms.field}>
        <label className={forms.label} htmlFor="doc-note">
          What changed <span className={forms.optional}>(optional)</span>
        </label>
        <input
          id="doc-note"
          name="changeNote"
          className={forms.control}
          maxLength={200}
          placeholder="Split the payment into two stages"
          disabled={pending}
        />
      </div>

      <div className={forms.actions}>
        <button type="submit" className={forms.button} disabled={pending}>
          {pending ? 'Saving…' : 'Save a new version'}
        </button>
        <p className={forms.payoff}>
          Always a new version, never an overwrite. What was sent stays exactly as it was sent.
        </p>
      </div>
      <Result state={state} />
    </form>
  );
}

export function SendForSignature({
  documentId,
  alreadySent,
}: {
  documentId: string;
  alreadySent: boolean;
}) {
  const [state, action, pending] = useActionState(sendForSignature, INITIAL);

  return (
    <form action={action} className={forms.form}>
      <input type="hidden" name="documentId" value={documentId} />
      <div className={forms.actions}>
        <button type="submit" className={forms.button} disabled={pending}>
          {pending ? 'Sending…' : alreadySent ? 'Send the latest version' : 'Send for signature'}
        </button>
        <p className={forms.payoff}>
          Pins this version and a fingerprint of it. Any earlier request is withdrawn, so they
          cannot sign something you have moved on from.
        </p>
      </div>
      <Result state={state} />
    </form>
  );
}
