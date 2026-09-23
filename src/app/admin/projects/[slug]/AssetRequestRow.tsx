'use client';

import React, { useActionState } from 'react';
import { Paperclip } from 'lucide-react';
import { setAssetRequestStatus, type EditState } from './actions';
import { assignClientItem, type AssignState } from './assign-actions';
import { Select, type SelectOption } from '@/components/console/Select';
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
  response = null,
  files = [],
  assigneeId = '',
  contacts = [],
}: {
  id: string;
  title: string;
  detail: string | null;
  status: string;
  /** What the client wrote back, when it was words rather than a file. */
  response?: string | null;
  /** What the client attached. Reached at /files/<id> on this host. */
  files?: { id: string; filename: string; size: string; when: string }[];
  /** Who at the client is sending it, from their own people. */
  assigneeId?: string;
  contacts?: readonly SelectOption[];
}) {
  const [state, action, pending] = useActionState(setAssetRequestStatus, INITIAL);
  const [assignState, assign] = useActionState(assignClientItem, { status: 'idle' } as AssignState);

  return (
    <div className={styles.row}>
      <div className={styles.text}>
        <span className={styles.title}>{title}</span>
        {detail && <span className={styles.detail}>{detail}</span>}
        {response && <span className={styles.response}>{response}</span>}
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
        {contacts.length > 1 && (
          <form action={assign} className={styles.assignee}>
            <input type="hidden" name="assetRequestId" value={id} />
            <Select
              name="assigneeId"
              aria-label={`Who at the client sends ${title}`}
              defaultValue={assigneeId}
              options={contacts}
              size="sm"
              autoSubmit
            />
          </form>
        )}
        {(state.status === 'error' || assignState.status === 'error') && (
          <span className={forms.error} role="alert">
            {state.status === 'error' ? state.message : assignState.message}
          </span>
        )}
      </div>
      <form action={action} className={styles.status}>
        <input type="hidden" name="assetRequestId" value={id} />
        <Select
          name="assetStatus"
          aria-label={`${title} status`}
          defaultValue={status}
          options={STATUSES}
          disabled={pending}
          size="sm"
          autoSubmit
        />
      </form>
    </div>
  );
}
