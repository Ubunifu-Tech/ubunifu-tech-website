'use client';

import React, { useActionState, useState } from 'react';
import { Sparkles } from 'lucide-react';
import {
  askCopilot,
  saveDetails,
  saveVersion,
  sendForSignature,
  type DocumentState,
} from './actions';
import { RichText } from '@/components/console/RichText';
import { Select } from '@/components/console/Select';
import styles from '../Admin.module.css';
import forms from '@/styles/forms.module.css';
import { Callout } from '@/components/console/Callout';
import { DOCUMENT_KINDS } from './kinds';

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
export function Copilot({ documentId, turns }: { documentId: string; turns: CopilotTurn[] }) {
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
          <p className={forms.hint}>It knows the project&rsquo;s plan, fees and dates.</p>
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
          <p className={forms.payoff}>It saves a new version for you to check. It never sends.</p>
        </div>
        <Result state={state} />
      </form>
    </>
  );
}

/** The document's kind and title. */
export function DetailsForm({
  documentId,
  title,
  kind,
}: {
  documentId: string;
  title: string;
  kind: string;
}) {
  const [state, action, pending] = useActionState(saveDetails, INITIAL);

  return (
    <form action={action} className={forms.form}>
      <input type="hidden" name="documentId" value={documentId} />
      <div className={forms.grid}>
        <div className={forms.field}>
          <label className={forms.label} htmlFor="doc-kind">
            Kind
          </label>
          <Select id="doc-kind" name="kind" defaultValue={kind} options={DOCUMENT_KINDS} />
        </div>
        <div className={forms.field}>
          <label className={forms.label} htmlFor="doc-title">
            Title
          </label>
          <input
            id="doc-title"
            name="title"
            className={forms.control}
            maxLength={200}
            defaultValue={title}
            required
          />
        </div>
      </div>
      <div className={forms.actions}>
        <button type="submit" className={`${forms.button} ${forms.quiet}`} disabled={pending}>
          {pending ? 'Saving…' : 'Save details'}
        </button>
        <Result state={state} />
      </div>
    </form>
  );
}

export function VersionEditor({
  documentId,
  body,
  withFees,
}: {
  documentId: string;
  body: string;
  withFees: boolean;
}) {
  const [state, action, pending] = useActionState(saveVersion, INITIAL);
  const [draft, setDraft] = useState(body);
  const hasMarkers = draft.includes('[TO CONFIRM');

  return (
    <form action={action} className={forms.form}>
      <input type="hidden" name="documentId" value={documentId} />
      <RichText
        name="body"
        label="The document"
        initialMarkdown={body}
        disabled={pending}
        minHeight="tall"
        onMarkdownChange={setDraft}
        hint={
          withFees
            ? 'Type {{fees}} on its own line where the fee table should go. Otherwise it goes at the end.'
            : undefined
        }
      />

      {hasMarkers && (
        <Callout kind="warn" title="Some details still need filling in">
          Replace each TO CONFIRM before sending.
        </Callout>
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
        <button
          type="submit"
          name="then"
          value="review"
          className={forms.button}
          disabled={pending}
        >
          {pending ? 'Saving…' : 'Save and review'}
        </button>
        <button type="submit" className={`${forms.button} ${forms.quiet}`} disabled={pending}>
          Save
        </button>
        <Result state={state} />
      </div>
    </form>
  );
}

export function SendForSignature({
  documentId,
  alreadySent,
  ready,
  signer,
}: {
  documentId: string;
  alreadySent: boolean;
  ready: boolean;
  signer: string | null;
}) {
  const [state, action, pending] = useActionState(sendForSignature, INITIAL);

  return (
    <form action={action} className={forms.form}>
      <input type="hidden" name="documentId" value={documentId} />
      {signer && ready && (
        <p className={styles.note}>
          {signer} gets an email with a link to read and sign it.
          {alreadySent && ' The copy they have now is withdrawn.'}
        </p>
      )}
      <div className={forms.actions}>
        <button type="submit" className={forms.button} disabled={pending || !ready}>
          {pending ? 'Sending…' : alreadySent ? 'Send the new version' : 'Send for signature'}
        </button>
      </div>
      <Result state={state} />
    </form>
  );
}
