'use client';

import React, { useActionState, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { askCopilot, saveVersion, sendForSignature, type DocumentState } from './actions';
import { RichText } from '@/components/console/RichText';
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

export type CopilotTurn = {
  id: string;
  role: string;
  content: string;
  toolName: string | null;
  when: string;
};

/**
 * The copilot, as a conversation.
 *
 * A thread rather than a button, because drafting is back-and-forth: "draft
 * it", then "make the payment two stages", then "that clause is too long". The
 * thread is stored, so it survives a reload and can be read afterwards — what
 * was asked for, and what the model did about it.
 *
 * It can write a version and nothing else. It never sends.
 */
export function Copilot({
  documentId,
  turns,
}: {
  documentId: string;
  turns: CopilotTurn[];
}) {
  const [state, action, pending] = useActionState(askCopilot, INITIAL);
  const [draft, setDraft] = useState('');

  return (
    <>
      {turns.length > 0 && (
        <ul className={styles.thread}>
          {turns.map((turn) => (
            <li
              key={turn.id}
              className={`${styles.message} ${turn.role === 'user' ? '' : styles.fromUs}`}
            >
              <p className={styles.messageWho}>
                {turn.role === 'user' ? 'You' : 'Assistant'} · {turn.when}
                {turn.toolName === 'save_draft' && ' · wrote a version'}
              </p>
              <p className={styles.messageBody}>{turn.content}</p>
            </li>
          ))}
        </ul>
      )}

      <form action={action} className={forms.form}>
        <input type="hidden" name="documentId" value={documentId} />
        <div className={forms.field}>
          <label className={forms.label} htmlFor="copilot-message">
            {turns.length === 0 ? 'Ask for a draft' : 'What next?'}
          </label>
          <textarea
            id="copilot-message"
            name="message"
            className={`${forms.control} ${forms.textarea}`}
            maxLength={4000}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={
              turns.length === 0
                ? 'Draft the agreement. Two-stage payment, and they want the domain in their own name.'
                : 'Shorten the scope section, and add a line about the review rounds.'
            }
            disabled={pending}
          />
          <p className={forms.hint}>
            It already has the project&rsquo;s fees, plan, dates and everything we have asked them
            for. This is for what is not written down anywhere.
          </p>
        </div>

        <div className={forms.actions}>
          <button
            type="submit"
            className={`${forms.button} ${forms.quiet}`}
            disabled={pending || draft.trim().length < 2}
          >
            <Sparkles size={15} strokeWidth={1.8} aria-hidden="true" />
            {pending ? 'Thinking…' : 'Send'}
          </button>
          <p className={forms.payoff}>
            When it writes, it saves a new version you can edit or discard. It never sends
            anything, and anything it had to guess is marked TO CONFIRM.
          </p>
        </div>
        <Result state={state} />
      </form>
    </>
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
        <span className={forms.label}>The document</span>
        <RichText
          name="body"
          label="The document"
          initialMarkdown={body}
          disabled={pending}
          minHeight="tall"
          onMarkdownChange={setDraft}
          hint="The toolbar is everything this document can contain. There is no code, no quote and no link, because a contract renders from a fixed set of shapes and anything outside it would read differently to the person signing."
        />
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
