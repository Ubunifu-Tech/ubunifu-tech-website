'use client';

import Link from 'next/link';
import { COPILOT } from '@/lib/console/staff-agent/identity';
import { useActionState, useEffect, useState } from 'react';
import {
  discardDocument,
  chooseSigner,
  saveDetails,
  saveVersion,
  resendSignatureLink,
  sendForSignature,
  setSuggestionAside,
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
import { keepTyping } from '@/components/console/keepTyping';

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
      {state.signedOut && (
        <>
          {' '}
          <a href="/sign-in" target="_blank" rel="noopener" className={forms.link}>
            Sign in
          </a>
        </>
      )}
    </p>
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
  reference,
}: {
  documentId: string;
  versionId: string | undefined;
  version: number;
  body: string;
  withFees: boolean;
  reference: string;
}) {
  const [unsaved, setUnsaved] = useState(false);
  const empty = body.trim().length === 0;
  const about = `/copilot?about=${encodeURIComponent(`/documents/${reference}`)}`;
  const firstDraft = `${about}&ask=${encodeURIComponent(`Write the first draft of ${reference} from the project.`)}`;

  return (
    <>
      <section className={forms.card}>
        <div className={forms.cardHeader}>
          <h2 className={forms.cardTitle}>The document</h2>
          <span className={forms.cardMeta}>Version {version}</span>
        </div>
        <VersionEditor
          // A new version, from Copilot or anyone else, replaces what is in the editor.
          key={versionId}
          documentId={documentId}
          body={body}
          withFees={withFees}
          locked={false}
          onUnsavedChange={setUnsaved}
        />
      </section>

      <section className={forms.card}>
        <div className={forms.cardHeader}>
          <h2 className={forms.cardTitle}>{COPILOT.short}</h2>
        </div>
        <p className={styles.note}>
          {empty
            ? `${COPILOT.short} can write the first draft from the project: its plan, dates, fees and what the client was asked for.`
            : `Ask ${COPILOT.short} to shorten, expand or reword it.`}{' '}
          It shows you what would change before anything is saved, and it never sends.
        </p>
        {unsaved ? (
          <p className={forms.hint}>Save your edits first, so it works from them.</p>
        ) : (
          <div className={`${forms.actions} ${forms.actionsBare}`}>
            {empty ? (
              <Link href={firstDraft} className={forms.button}>
                Write the first draft
              </Link>
            ) : (
              <Link href={about} className={forms.button}>
                Ask for changes
              </Link>
            )}
            {empty && (
              <Link href={about} className={`${forms.button} ${forms.quiet}`}>
                Say what you want instead
              </Link>
            )}
          </div>
        )}
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
    <form action={action} onSubmit={keepTyping(action)} className={forms.form}>
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
}: {
  documentId: string;
  alreadySent: boolean;
  /** The same version again, because the time to sign the last one ran out. */
  again?: boolean;
  ready: boolean;
}) {
  const [state, action, pending] = useActionState(sendForSignature, INITIAL);

  return (
    <form action={action} className={styles.rowAction} data-wide={state.message ? '' : undefined}>
      <input type="hidden" name="documentId" value={documentId} />
      <button type="submit" className={forms.button} disabled={pending || !ready}>
        {pending
          ? 'Sending…'
          : again
            ? 'Send it again'
            : alreadySent
              ? 'Send the new version'
              : 'Send for signature'}
      </button>
      <Result state={state} />
    </form>
  );
}

/**
 * Who at the client is asked to sign. It saves as it is changed, like the
 * other one-field choices in the console.
 */
export function ChooseSigner({
  documentId,
  chosen,
  people,
}: {
  documentId: string;
  chosen: string;
  people: { id: string; label: string; disabled: boolean }[];
}) {
  const [state, action] = useActionState(chooseSigner, INITIAL);
  return (
    <form action={action} className={forms.field}>
      <input type="hidden" name="documentId" value={documentId} />
      <span className={forms.label} id="signer-label">
        Who signs for the client
      </span>
      <Select
        name="signerId"
        aria-labelledby="signer-label"
        defaultValue={chosen}
        placeholder="Choose who signs"
        autoSubmit
        options={people.map((person) => ({ value: person.id, label: person.label, disabled: person.disabled }))}
      />
      {state.message ? (
        <p className={state.status === 'error' ? forms.error : forms.hint} role="status" aria-live="polite">
          {state.message}
        </p>
      ) : (
        <p className={forms.hint}>Only someone with portal access can sign. Their main contact unless you choose another.</p>
      )}
    </form>
  );
}

/** The link again, for the version already with them. */
export function ResendSignatureLink({ documentId }: { documentId: string }) {
  const [state, action, pending] = useActionState(resendSignatureLink, INITIAL);
  return (
    <form action={action} className={styles.rowAction} data-wide={state.message ? '' : undefined}>
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
      <div className={styles.rowAction} data-end="" data-wide={state.message ? '' : undefined}>
        <button type="button" className={`${forms.button} ${forms.quiet}`} onClick={() => setConfirming(true)}>
          Withdraw it
        </button>
        <Result state={state} />
      </div>
    );
  }
  return (
    <form action={action} className={styles.rowAction} data-wide="">
      <input type="hidden" name="documentId" value={documentId} />
      <p className={styles.note}>They will no longer be able to sign it. You can change it and send it again.</p>
      <div className={`${forms.actions} ${forms.actionsBare}`}>
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
