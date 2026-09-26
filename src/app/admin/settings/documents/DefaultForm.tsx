'use client';

import { useActionState } from 'react';
import { saveDocumentDefault, type DefaultsState } from './actions';
import forms from '@/styles/forms.module.css';

const INITIAL: DefaultsState = { status: 'idle' };

/** The standard sections for one kind of document. */
export function DefaultForm({
  kind,
  label,
  body,
}: {
  kind: string;
  label: string;
  body: string;
}) {
  const [state, action, pending] = useActionState(saveDocumentDefault, INITIAL);
  const id = `default-${kind}`;
  return (
    <form action={action} className={forms.form}>
      <input type="hidden" name="kind" value={kind} />
      <div className={forms.field}>
        <label className={forms.label} htmlFor={id}>
          On every {label.toLowerCase()}
        </label>
        <textarea
          id={id}
          name="body"
          defaultValue={body}
          rows={10}
          maxLength={20000}
          className={`${forms.control} ${forms.textarea} ${forms.editor}`}
          placeholder={'## After handover\n\nChanges after handover are quoted first, based on the work involved.'}
        />
        <p className={forms.hint}>
          Added at the end of every {label.toLowerCase()} when it is sent. To put it somewhere
          else, write {'{{standard}}'} on its own line in the document.
        </p>
      </div>
      <div className={forms.actions}>
        <button type="submit" className={forms.button} disabled={pending}>
          {pending ? 'Saving…' : 'Save'}
        </button>
        {state.message && (
          <p
            className={state.status === 'error' ? forms.error : forms.hint}
            role="status"
            aria-live="polite"
          >
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
