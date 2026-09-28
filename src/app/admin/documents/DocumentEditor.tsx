'use client';

import { useActionState, useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import {
  askCopilot,
  discardDocument,
  saveDetails,
  saveVersion,
  resendSignatureLink,
  sendForSignature,
  setSuggestionAside,
  startFreshCopilotThread,
  startFromSuggestion,
  withdrawDocument,
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
  /** 'You', a colleague's name, 'Staff' for older rows, or 'Assistant'. */
  author: string;
  content: string;
  toolName: string | null;
  when: string;
};

/**
 * Asking and starting afresh share one outcome, so the line under Send is
 * always about the last thing pressed.
 */
function copilotAction(previous: DocumentState, formData: FormData): Promise<DocumentState> {
  return formData.get('intent') === 'fresh'
    ? startFreshCopilotThread(previous, formData)
    : askCopilot(previous, formData);
}

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
  empty,
  blocked,
  onDraftingChange,
}: {
  documentId: string;
  turns: CopilotTurn[];
  /** The document has nothing written in it yet. */
  empty: boolean;
  /** The editor holds changes that are not saved yet. */
  blocked: boolean;
  onDraftingChange: (drafting: boolean) => void;
}) {
  const [state, action, pending] = useActionState(copilotAction, INITIAL);
  const [draft, setDraft] = useState('');
  const [intent, setIntent] = useState<'ask' | 'fresh'>('ask');
  const drafting = pending && intent === 'ask';

  useEffect(() => {
    onDraftingChange(drafting);
  }, [drafting, onDraftingChange]);

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
                {turn.author} · {turn.when}
                {turn.toolName === 'save_draft' && ' · wrote a version'}
              </p>
              <p className={styles.messageBody}>{turn.content}</p>
            </li>
          ))}
        </ul>
      )}

      {turns.length > 0 && (
        <form
          action={action}
          onSubmit={() => setIntent('fresh')}
          className={`${forms.actions} ${forms.actionsBare}`}
        >
          <input type="hidden" name="documentId" value={documentId} />
          <input type="hidden" name="intent" value="fresh" />
          <button type="submit" className={`${forms.button} ${forms.quiet}`} disabled={pending}>
            {pending && intent === 'fresh' ? 'Starting…' : 'Start a fresh thread'}
          </button>
          <p className={forms.payoff}>The document stays as it is.</p>
        </form>
      )}

      {turns.length === 0 && empty && (
        <form action={action} onSubmit={() => setIntent('ask')} className={forms.actions}>
          <input type="hidden" name="documentId" value={documentId} />
          <input
            type="hidden"
            name="message"
            value="Write the first draft of this document from what you know about the project, in the usual shape for its kind. Mark anything you do not know as TO CONFIRM."
          />
          <button type="submit" className={forms.button} disabled={pending || blocked}>
            <Sparkles size={15} strokeWidth={1.8} aria-hidden="true" />
            {drafting ? 'Writing…' : 'Write the first draft'}
          </button>
          <p className={forms.payoff}>Or say what you want below.</p>
        </form>
      )}

      <form action={action} onSubmit={() => setIntent('ask')} className={forms.form}>
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
            It knows the project&rsquo;s plan, fees, dates, what we need from them, their enquiry
            and the other documents on the project.
          </p>
        </div>

        <div className={forms.actions}>
          <button
            type="submit"
            className={`${forms.button} ${forms.quiet}`}
            disabled={pending || blocked || draft.trim().length < 2}
          >
            <Sparkles size={15} strokeWidth={1.8} aria-hidden="true" />
            {drafting ? 'Thinking…' : 'Send'}
          </button>
          <p className={forms.payoff}>
            {blocked
              ? 'Save your edits first, then ask.'
              : 'It saves a new version for you to check. It never sends.'}
          </p>
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

/**
 * The Write step: the document beside the assistant.
 *
 * A version the assistant saves replaces what is in the editor, so the
 * assistant waits while there are edits to save, and the editor waits while
 * the assistant is writing. Either way nothing typed is lost.
 */
export function WriteStep({
  documentId,
  versionId,
  version,
  body,
  withFees,
  turns,
}: {
  documentId: string;
  versionId: string | undefined;
  version: number;
  body: string;
  withFees: boolean;
  turns: CopilotTurn[];
}) {
  const [unsaved, setUnsaved] = useState(false);
  const [drafting, setDrafting] = useState(false);

  return (
    <>
      <section className={forms.card}>
        <div className={forms.cardHeader}>
          <h2 className={forms.cardTitle}>The document</h2>
          <span className={forms.cardMeta}>Version {version}</span>
        </div>
        <VersionEditor
          // A new version from the assistant replaces what is in the editor.
          key={versionId}
          documentId={documentId}
          body={body}
          withFees={withFees}
          locked={drafting}
          onUnsavedChange={setUnsaved}
        />
      </section>

      <section className={forms.card}>
        <div className={forms.cardHeader}>
          <h2 className={forms.cardTitle}>Assistant</h2>
        </div>
        <Copilot
          documentId={documentId}
          turns={turns}
          empty={body.trim().length === 0}
          blocked={unsaved}
          onDraftingChange={setDrafting}
        />
      </section>
    </>
  );
}

export function VersionEditor({
  documentId,
  body,
  withFees,
  locked = false,
  onUnsavedChange,
}: {
  documentId: string;
  body: string;
  withFees: boolean;
  /** The assistant is writing a version that will replace this one. */
  locked?: boolean;
  onUnsavedChange?: (unsaved: boolean) => void;
}) {
  const [state, action, pending] = useActionState(saveVersion, INITIAL);
  const [draft, setDraft] = useState(body);
  const hasMarkers = draft.includes('[TO CONFIRM');
  const busy = pending || locked;

  // A new editor holds exactly what is saved. The editor reports only what
  // somebody types, never the text it loads.
  useEffect(() => {
    onUnsavedChange?.(false);
  }, [onUnsavedChange]);

  return (
    <form action={action} className={forms.form}>
      <input type="hidden" name="documentId" value={documentId} />
      <RichText
        name="body"
        label="The document"
        initialMarkdown={body}
        disabled={busy}
        minHeight="tall"
        onMarkdownChange={(markdown) => {
          setDraft(markdown);
          onUnsavedChange?.(markdown !== body);
        }}
        hint={
          locked
            ? 'The assistant is writing a new version. You can edit again when it is done.'
            : withFees
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
          disabled={busy}
        />
      </div>

      <div className={forms.actions}>
        <button
          type="submit"
          name="then"
          value="review"
          className={forms.button}
          disabled={busy}
        >
          {pending ? 'Saving…' : 'Save and review'}
        </button>
        <button type="submit" className={`${forms.button} ${forms.quiet}`} disabled={busy}>
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
  again = false,
  ready,
  signer,
}: {
  documentId: string;
  alreadySent: boolean;
  /** The same version again, because the time to sign the last one ran out. */
  again?: boolean;
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
          {alreadySent && !again && ' The copy they have now is withdrawn.'}
        </p>
      )}
      <div className={forms.actions}>
        <button type="submit" className={forms.button} disabled={pending || !ready}>
          {pending
            ? 'Sending…'
            : again
              ? 'Send it again'
              : alreadySent
                ? 'Send the new version'
                : 'Send for signature'}
        </button>
      </div>
      <Result state={state} />
    </form>
  );
}

/** The link again, for the version already with them. */
export function ResendSignatureLink({ documentId }: { documentId: string }) {
  const [state, action, pending] = useActionState(resendSignatureLink, INITIAL);
  return (
    <form action={action} className={forms.actions}>
      <input type="hidden" name="documentId" value={documentId} />
      <button type="submit" className={`${forms.button} ${forms.quiet}`} disabled={pending}>
        {pending ? 'Sending…' : 'Email the link again'}
      </button>
      <Result state={state} />
    </form>
  );
}

/** Takes back a document the client has not signed yet. */
export function WithdrawDocument({ documentId }: { documentId: string }) {
  const [state, action, pending] = useActionState(withdrawDocument, INITIAL);
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <div className={forms.actions}>
        <button type="button" className={`${forms.button} ${forms.quiet}`} onClick={() => setConfirming(true)}>
          Withdraw it
        </button>
        <Result state={state} />
      </div>
    );
  }
  return (
    <form action={action} className={forms.form}>
      <input type="hidden" name="documentId" value={documentId} />
      <p className={styles.note}>They will no longer be able to sign it. You can change it and send it again.</p>
      <div className={forms.actions}>
        <button type="submit" className={`${forms.button} ${forms.danger}`} disabled={pending}>
          {pending ? 'Withdrawing…' : 'Withdraw'}
        </button>
        <button type="button" className={`${forms.button} ${forms.quiet}`} onClick={() => setConfirming(false)}>
          Keep it with them
        </button>
      </div>
      <Result state={state} />
    </form>
  );
}

/**
 * What to do with wording a client suggested.
 *
 * Starting from it goes straight through when the version they saw is still
 * the latest, since nothing is lost: it becomes the next version and the Write
 * step opens on it. When somebody has saved a newer version since, the press
 * first says that the next version starts from their wording rather than from
 * that one. Setting it aside always asks first, because it leaves the list.
 */
export function SuggestionActions({
  suggestionId,
  basedOnVersion,
  latestVersion,
}: {
  suggestionId: string;
  basedOnVersion: number;
  latestVersion: number;
}) {
  const [startState, startAction, starting] = useActionState(startFromSuggestion, INITIAL);
  const [asideState, asideAction, settingAside] = useActionState(setSuggestionAside, INITIAL);
  const [confirming, setConfirming] = useState<'start' | 'aside' | null>(null);
  const pending = starting || settingAside;
  const newer = latestVersion > basedOnVersion;

  if (confirming === 'aside') {
    return (
      <form action={asideAction} className={forms.form}>
        <input type="hidden" name="suggestionId" value={suggestionId} />
        <p className={styles.note}>
          It comes off this list and they are not told. The version they have stays with them.
        </p>
        <div className={forms.actions}>
          <button type="submit" className={`${forms.button} ${forms.danger}`} disabled={pending}>
            {settingAside ? 'Setting it aside…' : 'Set it aside'}
          </button>
          <button
            type="button"
            className={`${forms.button} ${forms.quiet}`}
            onClick={() => setConfirming(null)}
            disabled={pending}
          >
            Keep it
          </button>
        </div>
        <Result state={asideState} />
      </form>
    );
  }

  if (confirming === 'start') {
    return (
      <form action={startAction} className={forms.form}>
        <input type="hidden" name="suggestionId" value={suggestionId} />
        <p className={styles.note}>
          Version {latestVersion} was saved after they saw version {basedOnVersion}. The next version
          starts from their wording instead, and version {latestVersion} stays in the list of versions.
        </p>
        <div className={forms.actions}>
          <button type="submit" className={forms.button} disabled={pending}>
            {starting ? 'Starting…' : 'Start from their wording'}
          </button>
          <button
            type="button"
            className={`${forms.button} ${forms.quiet}`}
            onClick={() => setConfirming(null)}
            disabled={pending}
          >
            Cancel
          </button>
        </div>
        <Result state={startState} />
      </form>
    );
  }

  return (
    <form action={startAction} className={forms.form}>
      <input type="hidden" name="suggestionId" value={suggestionId} />
      <div className={forms.actions}>
        {newer ? (
          <button
            type="button"
            className={forms.button}
            onClick={() => setConfirming('start')}
            disabled={pending}
          >
            Start the next version from this
          </button>
        ) : (
          <button type="submit" className={forms.button} disabled={pending}>
            {starting ? 'Starting…' : 'Start the next version from this'}
          </button>
        )}
        <button
          type="button"
          className={`${forms.button} ${forms.quiet}`}
          onClick={() => setConfirming('aside')}
          disabled={pending}
        >
          Set aside
        </button>
      </div>
      <Result state={startState} />
      <Result state={asideState} />
    </form>
  );
}

/** Throwing away a draft that never went out, after asking once. */
export function DiscardDraft({ documentId }: { documentId: string }) {
  const [state, action, pending] = useActionState(discardDocument, INITIAL);
  const [asking, setAsking] = useState(false);

  if (!asking) {
    return (
      <button type="button" className={`${forms.button} ${forms.quiet}`} onClick={() => setAsking(true)}>
        Discard this draft
      </button>
    );
  }
  return (
    <form action={action} className={forms.form}>
      <input type="hidden" name="documentId" value={documentId} />
      <p className={forms.hint}>It has never been sent, so nothing is lost but the draft itself.</p>
      <div className={forms.actions}>
        <button type="submit" className={`${forms.button} ${forms.danger}`} disabled={pending}>
          {pending ? 'Discarding…' : 'Discard it'}
        </button>
        <button type="button" className={`${forms.button} ${forms.quiet}`} onClick={() => setAsking(false)}>
          Keep it
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
