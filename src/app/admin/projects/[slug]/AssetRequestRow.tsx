'use client';

import React, { useActionState, useRef } from 'react';
import { setAssetRequestStatus, type EditState } from './actions';
import styles from '../../Admin.module.css';
import forms from '@/styles/forms.module.css';

const INITIAL: EditState = { status: 'idle' };

const STATUSES = [
  { value: 'requested', label: 'Still waiting' },
  { value: 'received', label: 'Received' },
  { value: 'waived', label: 'Not needed' },
  { value: 'blocked', label: 'They cannot get it' },
];

export function AssetRequestRow({
  id,
  title,
  detail,
  status,
}: {
  id: string;
  title: string;
  detail: string | null;
  status: string;
}) {
  const [state, action, pending] = useActionState(setAssetRequestStatus, INITIAL);
  const form = useRef<HTMLFormElement>(null);

  return (
    <form action={action} ref={form} className={styles.row}>
      <input type="hidden" name="assetRequestId" value={id} />
      <span>
        {title}
        {detail && <span className={styles.rowLabel}> · {detail}</span>}
        {state.status === 'error' && (
          <span className={forms.error} role="alert">
            {' '}
            {state.message}
          </span>
        )}
      </span>
      <span className={forms.selectWrap}>
        <select
          name="assetStatus"
          aria-label={`${title} — where it stands`}
          defaultValue={status}
          className={`${forms.control} ${forms.select}`}
          disabled={pending}
          onChange={() => form.current?.requestSubmit()}
        >
          {STATUSES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </span>
    </form>
  );
}
