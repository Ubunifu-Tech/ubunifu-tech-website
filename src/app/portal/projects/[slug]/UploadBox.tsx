'use client';

import React, { useRef, useState } from 'react';
import { upload } from '@vercel/blob/client';
import { confirmUpload } from './actions';
import forms from '@/styles/forms.module.css';
import styles from '../../Portal.module.css';

type Stage =
  | { kind: 'idle' }
  | { kind: 'sending'; name: string; index: number; count: number; percent: number }
  | { kind: 'done'; sent: number; problems: string[] };

/**
 * Attaching files to the thing we asked for.
 *
 * The bytes go straight from the browser to the store, using a token this
 * page asks the server for, so the size limit is the store's rather than a
 * serverless function's. Only when a file finishes does the server hear about
 * it, and what it hears is a URL it then verifies against the store itself.
 *
 * Several files can be picked at once, because what we ask for is often a set
 * of photographs. They go one after another, each confirmed before the next,
 * so a slow connection shows steady progress instead of one long stall, and
 * one failure does not lose the rest.
 */
export function UploadBox({
  assetRequestId,
  accept,
  maxBytes,
  hint,
  more = false,
}: {
  assetRequestId: string;
  accept: string;
  maxBytes: number;
  hint: string;
  /** Something is already attached, so the button offers more. */
  more?: boolean;
}) {
  const [stage, setStage] = useState<Stage>({ kind: 'idle' });
  const inputRef = useRef<HTMLInputElement>(null);

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) return;

    const problems: string[] = [];
    const sendable = files.filter((file) => {
      if (file.size <= maxBytes) return true;
      problems.push(`${file.name} is too big to send here. Email it over and we will add it.`);
      return false;
    });

    let sent = 0;
    for (const [index, file] of sendable.entries()) {
      const at = { name: file.name, index: index + 1, count: sendable.length };
      setStage({ kind: 'sending', ...at, percent: 0 });
      try {
        // Stored under the item it answers; the server only records it there.
        const blob = await upload(`requests/${assetRequestId}/${file.name.replace(/[\\/]/g, '-')}`, file, {
          access: 'private',
          handleUploadUrl: '/api/portal/uploads',
          clientPayload: assetRequestId,
          multipart: true,
          onUploadProgress: ({ percentage }) =>
            setStage({ kind: 'sending', ...at, percent: Math.round(percentage) }),
        });

        // The server verifies the finished URL against the store before a
        // row exists.
        const formData = new FormData();
        formData.set('assetRequestId', assetRequestId);
        formData.set('blobUrl', blob.url);
        formData.set('filename', file.name);
        const result = await confirmUpload({ status: 'idle' }, formData);
        if (result.status === 'error') {
          problems.push(`${file.name}: ${result.message}`);
        } else {
          sent += 1;
        }
      } catch (error) {
        problems.push(
          error instanceof Error && error.message.includes('not allowed')
            ? `${file.name} is a kind of file that cannot go here.`
            : `${file.name} did not go through. Try it again.`,
        );
      }
    }

    setStage({ kind: 'done', sent, problems });
  }

  const sending = stage.kind === 'sending';

  return (
    <div className={styles.uploadBox}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className={styles.fileInput}
        onChange={onPick}
        disabled={sending}
      />
      <button
        type="button"
        className={`${forms.button} ${forms.quiet}`}
        onClick={() => inputRef.current?.click()}
        disabled={sending}
      >
        {sending
          ? stage.count > 1
            ? `Sending ${stage.index} of ${stage.count} · ${stage.percent}%`
            : `Sending ${stage.percent}%`
          : more
            ? 'Attach more files'
            : 'Attach files'}
      </button>

      <span className={forms.hint}>{sending ? stage.name : hint}</span>

      {stage.kind === 'done' && stage.sent > 0 && (
        <p className={forms.hint} role="status">
          {stage.sent === 1 ? 'Sent. We have it.' : `${stage.sent} files sent. We have them.`}
        </p>
      )}
      {stage.kind === 'done' &&
        stage.problems.map((problem) => (
          <p key={problem} className={forms.error} role="alert">
            {problem}
          </p>
        ))}
    </div>
  );
}
