'use client';

import React, { useActionState, useRef, useState } from 'react';
import { upload } from '@vercel/blob/client';
import { confirmUpload, type UploadState } from './actions';
import forms from '@/styles/forms.module.css';
import styles from '../../Portal.module.css';

const INITIAL: UploadState = { status: 'idle' };

type Stage =
  | { kind: 'idle' }
  | { kind: 'sending'; name: string; percent: number }
  | { kind: 'failed'; message: string };

/**
 * Attaching a file to the thing we asked for.
 *
 * The bytes go straight from the browser to the store, using a token this
 * page asks the server for — so the size limit is the store's rather than a
 * serverless function's, and a folder of photographs is possible. Only when
 * that finishes does the server hear about it, and what it hears is a URL it
 * then verifies against the store itself.
 *
 * Progress is shown because these are big files on connections that are not
 * always fast, and a button that looks stuck is a file nobody sends.
 */
export function UploadBox({
  assetRequestId,
  accept,
  maxBytes,
  hint,
}: {
  assetRequestId: string;
  accept: string;
  maxBytes: number;
  hint: string;
}) {
  const [state, action, pending] = useActionState(confirmUpload, INITIAL);
  const [stage, setStage] = useState<Stage>({ kind: 'idle' });
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const blobUrlRef = useRef<HTMLInputElement>(null);
  const filenameRef = useRef<HTMLInputElement>(null);

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > maxBytes) {
      setStage({
        kind: 'failed',
        message: 'That one is too big to send here. Email it over and we will add it.',
      });
      event.target.value = '';
      return;
    }

    setStage({ kind: 'sending', name: file.name, percent: 0 });

    try {
      const blob = await upload(file.name, file, {
        access: 'private',
        handleUploadUrl: '/api/portal/uploads',
        clientPayload: assetRequestId,
        multipart: true,
        onUploadProgress: ({ percentage }) =>
          setStage({ kind: 'sending', name: file.name, percent: Math.round(percentage) }),
      });

      // Hand the finished URL to the server action, which verifies it against
      // the store before a row exists.
      if (blobUrlRef.current) blobUrlRef.current.value = blob.url;
      if (filenameRef.current) filenameRef.current.value = file.name;
      setStage({ kind: 'idle' });
      formRef.current?.requestSubmit();
    } catch (error) {
      setStage({
        kind: 'failed',
        message:
          error instanceof Error && error.message.includes('not allowed')
            ? 'That kind of file cannot go here.'
            : 'That did not go through. Try it again?',
      });
    } finally {
      event.target.value = '';
    }
  }

  const busy = pending || stage.kind === 'sending';

  return (
    <form action={action} ref={formRef} className={styles.uploadBox}>
      <input type="hidden" name="assetRequestId" value={assetRequestId} />
      <input type="hidden" name="blobUrl" ref={blobUrlRef} />
      <input type="hidden" name="filename" ref={filenameRef} />

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className={styles.fileInput}
        onChange={onPick}
        disabled={busy}
      />
      <button
        type="button"
        className={`${forms.button} ${forms.quiet}`}
        onClick={() => inputRef.current?.click()}
        disabled={busy}
      >
        {stage.kind === 'sending'
          ? `Sending ${stage.percent}%`
          : pending
            ? 'Saving…'
            : 'Attach a file'}
      </button>

      <span className={forms.hint}>
        {stage.kind === 'sending' ? stage.name : hint}
      </span>

      {stage.kind === 'failed' && (
        <p className={forms.error} role="alert">
          {stage.message}
        </p>
      )}
      {state.status === 'error' && stage.kind !== 'failed' && (
        <p className={forms.error} role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
