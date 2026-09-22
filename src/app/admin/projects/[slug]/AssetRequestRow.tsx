'use client';

import React, { useActionState } from 'react';
import { Paperclip } from 'lucide-react';
import { setAssetRequestStatus, type EditState } from './actions';
import { Select } from '@/components/console/Select';
import forms from '@/styles/forms.module.css';
import styles from './AssetRequestRow.module.css';

const INITIAL: EditState = { status: 'idle' };

const STATUSES = [
  { value: 'requested', label: 'Waiting' },
  { value: 'received', label: 'Received' },
  { value: 'waived', label: 'Not needed' },
  { value: 'blocked', label: 'Not available' },
];

/** One thing we asked the client for, its files, and where it stands. */
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

  return (
    <form action={action} className={styles.row}>
      <input type="hidden" name="assetRequestId" value={id} />
      <div className={styles.text}>
        <span className={styles.title}>{title}</span>
        {detail && <span className={styles.detail}>{detail}</span>}
        {files.length > 0 && (
          <span className={styles.files}>
            {files.map((file) => (
              <a key={file.id} href={`/files/${file.id}`} className={styles.file} target="_blank" rel="noreferrer">
                <Paperclip size={13} strokeWidth={2} aria-hidden="true" />
                {file.filename}
                <span className={styles.fileMeta}>
                  {file.size} · {file.when}
                </span>
              </a>
            ))}
          </span>
        )}
        {state.status === 'error' && (
          <span className={forms.error} role="alert">
            {state.message}
          </span>
        )}
      </div>
      <div className={styles.status}>
        <Select
          name="assetStatus"
          aria-label={`${title} status`}
          defaultValue={status}
          options={STATUSES}
          disabled={pending}
          size="sm"
          autoSubmit
        />
      </div>
    </form>
  );
}
