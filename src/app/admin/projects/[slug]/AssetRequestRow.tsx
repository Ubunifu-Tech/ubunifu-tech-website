'use client';

import React, { useActionState, useRef } from 'react';
import { setAssetRequestStatus, type EditState } from './actions';
import styles from '../../Admin.module.css';
import forms from '@/styles/forms.module.css';
import { Select } from '@/components/console/Select';

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
  files = [],
}: {
  id: string;
  title: string;
  detail: string | null;
  status: string;
  /** What the client attached. Reached at /files/<id> on this host. */
  files?: { id: string; filename: string; size: string; when: string }[];
}) {
  const [state, action, pending] = useActionState(setAssetRequestStatus, INITIAL);
  const form = useRef<HTMLFormElement>(null);

  return (
    <form action={action} ref={form} className={styles.row}>
      <input type="hidden" name="assetRequestId" value={id} />
      <span>
        {title}
        {detail && <span className={styles.rowLabel}> · {detail}</span>}
        {files.length > 0 && (
          <span className={styles.rowFiles}>
            {files.map((file) => (
              <a key={file.id} href={`/files/${file.id}`} className={styles.rowFile}>
                {file.filename}
                <span className={styles.rowLabel}>
                  {' '}
                  {file.size} · {file.when}
                </span>
              </a>
            ))}
          </span>
        )}
        {state.status === 'error' && (
          <span className={forms.error} role="alert">
            {' '}
            {state.message}
          </span>
        )}
      </span>
      <Select
          name="assetStatus"
          aria-label={`${title} — status`}
          defaultValue={status}
          options={STATUSES}
          disabled={pending}
          size="sm"
          autoSubmit
        />
    </form>
  );
}
