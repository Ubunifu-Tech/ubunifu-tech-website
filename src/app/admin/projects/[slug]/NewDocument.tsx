'use client';

import React, { useActionState } from 'react';
import { createDocument, type DocumentState } from '../../documents/actions';
import forms from '@/styles/forms.module.css';
import { Select } from '@/components/console/Select';

const INITIAL: DocumentState = { status: 'idle' };

const KINDS = [
  { value: 'proposal', label: 'Proposal' },
  { value: 'contract', label: 'Agreement' },
  { value: 'statement_of_work', label: 'Statement of work' },
  { value: 'change_order', label: 'Change order' },
  { value: 'handover', label: 'Handover pack' },
  { value: 'other', label: 'Something else' },
];

export function NewDocument({ projectId, projectName }: { projectId: string; projectName: string }) {
  const [state, action, pending] = useActionState(createDocument, INITIAL);

  return (
    <form action={action} className={forms.form}>
      <input type="hidden" name="projectId" value={projectId} />
      <div className={forms.grid}>
        <div className={forms.field}>
          <label className={forms.label} htmlFor="doc-kind">
            What kind
          </label>
          <Select
              id="doc-kind"
              name="kind"
              defaultValue="proposal"
              options={KINDS}
              disabled={pending}
            />
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
            defaultValue={`${projectName} — proposal`}
            disabled={pending}
          />
          <p className={forms.hint}>What the client sees at the top of the email.</p>
        </div>
      </div>

      <div className={forms.actions}>
        <button type="submit" className={`${forms.button} ${forms.quiet}`} disabled={pending}>
          {pending ? 'Creating…' : 'New document'}
        </button>
        <p className={forms.payoff}>
          Opens the editor. Nothing goes to the client until you send it.
        </p>
      </div>

      {state.message && (
        <p className={forms.error} role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
