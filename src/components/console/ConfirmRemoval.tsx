'use client';

import React, { useActionState, useState } from 'react';
import { namesMatch, type RemovalState } from '@/lib/console/confirm-name';
import { Callout } from './Callout';
import { TextField } from './Fields';
import forms from '@/styles/forms.module.css';
import styles from './ConfirmRemoval.module.css';

const INITIAL: RemovalState = { status: 'idle' };

/**
 * Removing a whole client or project, behind two presses.
 *
 * The first press only says what will happen, with the real numbers. The
 * second needs the name typed out, because this is the one control in the
 * console that takes a record and everything under it out of sight at once,
 * and a stray click on the wrong page should not be enough.
 */
export function ConfirmRemoval({
  name,
  noun,
  action,
  hidden,
  consequences,
  onOpen,
}: {
  /** What has to be typed to confirm. */
  name: string;
  noun: 'client' | 'project';
  action: (previous: RemovalState, formData: FormData) => Promise<RemovalState>;
  hidden: Record<string, string>;
  /** One sentence each. Null while they are still being looked up. */
  consequences: string[] | null;
  /** Called on the first press, for a caller that looks the numbers up then. */
  onOpen?: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');

  if (!open) {
    return (
      <button
        type="button"
        className={`${forms.button} ${forms.danger}`}
        onClick={() => {
          setOpen(true);
          onOpen?.();
        }}
      >
        Remove {noun}
      </button>
    );
  }

  // Not ready until the page has said what will happen: a fast typist should
  // not be able to remove something before its consequences are on screen.
  const ready = namesMatch(typed, name) && consequences !== null;

  return (
    <form action={formAction} className={styles.confirm}>
      {Object.entries(hidden).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}

      {consequences === null ? (
        <p className={forms.hint}>Checking what it holds…</p>
      ) : (
        <div className={styles.summary}>
          <Callout kind="warn" title={`If you remove ${name}`} items={consequences} />
        </div>
      )}

      <TextField
        name="confirmName"
        label={`Type ${name} to confirm`}
        value={typed}
        onChange={(event) => setTyped(event.target.value)}
        autoComplete="off"
        spellCheck={false}
        maxLength={200}
        disabled={pending}
        required
      />

      <div className={styles.actions}>
        <button
          type="submit"
          className={`${forms.button} ${forms.danger}`}
          disabled={pending || !ready}
        >
          {pending ? 'Removing…' : `Remove ${noun}`}
        </button>
        <button
          type="button"
          className={`${forms.button} ${forms.quiet}`}
          disabled={pending}
          onClick={() => {
            setOpen(false);
            setTyped('');
          }}
        >
          Keep
        </button>
      </div>

      {state.status === 'error' && state.message && (
        <p className={forms.error} role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}

/** "3 invoices", "invoice": a count in words, without "1". */
function counted(count: number, one: string, many: string): string {
  return count === 1 ? one : `${count} ${many}`;
}

/** The documents out for signature, when there are any. */
export function withdrawnLine(waiting: number): string | null {
  if (waiting === 0) return null;
  return waiting === 1
    ? 'The document waiting for a signature is withdrawn.'
    : `${waiting} documents waiting for a signature are withdrawn.`;
}

/** What stays on record after a removal. */
export function onRecordLine(owner: 'Their' | 'Its', invoices: number, signed: number): string {
  const parts = [
    invoices > 0 ? counted(invoices, 'invoice', 'invoices') : null,
    signed > 0 ? counted(signed, 'signed document', 'signed documents') : null,
  ].filter((part): part is string => part !== null);
  if (parts.length === 0) return `${owner} history stays on record, out of sight.`;
  const single = parts.length === 1 && invoices + signed === 1;
  return `${owner} ${parts.join(' and ')} ${single ? 'stays' : 'stay'} on record, out of sight.`;
}
