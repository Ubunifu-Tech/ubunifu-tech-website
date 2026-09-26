'use client';

import React, { useActionState, useState } from 'react';
import { createDocument, type DocumentState } from '../../documents/actions';
import { DOCUMENT_KINDS } from '../../documents/kinds';
import forms from '@/styles/forms.module.css';
import { Select } from '@/components/console/Select';

const INITIAL: DocumentState = { status: 'idle' };

function titleFor(kind: string, projectName: string) {
  const label = DOCUMENT_KINDS.find((option) => option.value === kind)?.label ?? 'Document';
  return `${label} for ${projectName}`;
}

export function NewDocument({
  projectId,
  projectName,
  defaultKind = 'proposal',
}: {
  projectId: string;
  projectName: string;
  /** The kind the project is ready for: an agreement once the proposal is accepted. */
  defaultKind?: string;
}) {
  const [state, action, pending] = useActionState(createDocument, INITIAL);
  const [kind, setKind] = useState(defaultKind);
  const [title, setTitle] = useState(() => titleFor(defaultKind, projectName));
  const [edited, setEdited] = useState(false);

  return (
    <form action={action} className={forms.form}>
      <input type="hidden" name="projectId" value={projectId} />
      <div className={forms.grid}>
        <div className={`${forms.field} ${forms.wide}`}>
          <label className={forms.label} htmlFor="doc-kind">
            Kind
          </label>
          <Select
            id="doc-kind"
            name="kind"
            value={kind}
            onValueChange={(value) => {
              setKind(value);
              // The title follows the kind until somebody types their own.
              if (!edited) setTitle(titleFor(value, projectName));
            }}
            options={DOCUMENT_KINDS}
            disabled={pending}
          />
        </div>

        <div className={`${forms.field} ${forms.wide}`}>
          <label className={forms.label} htmlFor="doc-title">
            Title
          </label>
          <input
            id="doc-title"
            name="title"
            className={forms.control}
            maxLength={200}
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setEdited(true);
            }}
            disabled={pending}
          />
        </div>
      </div>

      <div className={forms.actions}>
        <button type="submit" className={forms.button} disabled={pending}>
          {pending ? 'Creating…' : 'Create and continue'}
        </button>
      </div>

      {state.message && (
        <p className={forms.error} role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
