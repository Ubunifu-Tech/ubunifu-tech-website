'use client';

import React, { useActionState, useState } from 'react';
import { archiveWriter, saveWriter, type WriterState } from './actions';
import { TextAreaField, TextField } from '@/components/console/Fields';
import { Avatar } from '@/components/console/Avatar';
import { uploadWebsiteImage } from '@/components/console/uploadWebsiteImage';
import forms from '@/styles/forms.module.css';
import styles from './Writers.module.css';

export type WriterFields = {
  id?: string;
  name: string;
  role: string;
  bio: string;
  link: string;
  photo: string;
  email: string;
  phone: string;
  notes: string;
};

const EMPTY: WriterFields = {
  name: '',
  role: '',
  bio: '',
  link: '',
  photo: '',
  email: '',
  phone: '',
  notes: '',
};

const INITIAL: WriterState = { status: 'idle' };

/**
 * A writer's details. Controlled, so a rejected save keeps everything that
 * was typed; a new writer's form empties once they are added.
 */
export function WriterForm({ writer }: { writer?: WriterFields }) {
  const [state, action, pending] = useActionState(saveWriter, INITIAL);
  const [values, setValues] = useState<WriterFields>(writer ?? EMPTY);
  const [photoStatus, setPhotoStatus] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // A new writer added: start the next one from an empty form. Done while
  // rendering, the first time each answer from the server is seen.
  const [answered, setAnswered] = useState(state);
  if (state !== answered) {
    setAnswered(state);
    if (state.status === 'done' && !writer) setValues(EMPTY);
  }

  const set = (key: keyof WriterFields) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((current) => ({ ...current, [key]: event.target.value }));
  const invalid = (field: string) => state.status === 'error' && state.field === field;

  async function onPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.type === 'image/gif') {
      setPhotoStatus('Use a still photo: JPG, PNG, WebP or AVIF.');
      return;
    }
    setUploading(true);
    setPhotoStatus('Uploading…');
    const result = await uploadWebsiteImage(file, (percent) => setPhotoStatus(`Uploading: ${percent}%`));
    setUploading(false);
    if (!result.ok) {
      setPhotoStatus(result.message);
      return;
    }
    setValues((current) => ({ ...current, photo: result.path }));
    setPhotoStatus(null);
  }

  return (
    <form action={action} className={forms.form}>
      {writer?.id && <input type="hidden" name="writerId" value={writer.id} />}
      <input type="hidden" name="photo" value={values.photo} />

      <fieldset className={forms.section}>
        <legend className={forms.sectionTitle}>On their articles</legend>
        <div className={forms.grid}>
          <TextField
            name="name"
            label="Name"
            value={values.name}
            onChange={set('name')}
            maxLength={120}
            required
            invalid={invalid('name')}
            hint="As it should appear in the byline."
          />
          <TextField
            name="role"
            label="Role"
            optional
            value={values.role}
            onChange={set('role')}
            maxLength={120}
            placeholder="Data lead, Ubunifu Technologies"
            invalid={invalid('role')}
          />
          <TextAreaField
            name="bio"
            label="Short bio"
            optional
            wide
            value={values.bio}
            onChange={set('bio')}
            maxLength={600}
            rows={3}
            invalid={invalid('bio')}
            hint="Two or three sentences, shown under their articles."
          />
          <TextField
            name="link"
            label="Link"
            optional
            type="url"
            value={values.link}
            onChange={set('link')}
            maxLength={300}
            placeholder="https://"
            invalid={invalid('link')}
            hint="Their site or a profile page."
          />
          <div className={forms.field}>
            <span className={forms.label}>
              Photo <span className={forms.optional}>(optional)</span>
            </span>
            <div className={styles.photoRow}>
              {values.photo ? (
                // eslint-disable-next-line @next/next/no-img-element -- a console preview of an upload that is not saved yet.
                <img src={values.photo} alt="" className={styles.photo} />
              ) : (
                <Avatar name={values.name || '?'} size="lg" />
              )}
              <label className={`${forms.button} ${forms.quiet} ${styles.upload}`} aria-disabled={uploading}>
                {uploading ? 'Uploading…' : values.photo ? 'Replace' : 'Upload'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  className={styles.fileInput}
                  onChange={onPhoto}
                  disabled={uploading}
                />
              </label>
              {values.photo && !uploading && (
                <button
                  type="button"
                  className={forms.link}
                  onClick={() => setValues((current) => ({ ...current, photo: '' }))}
                >
                  Remove
                </button>
              )}
            </div>
            {(photoStatus || invalid('photo')) && (
              <p className={forms.hint} role="status">
                {photoStatus ?? state.message}
              </p>
            )}
          </div>
        </div>
      </fieldset>

      <fieldset className={forms.section}>
        <legend className={forms.sectionTitle}>For us</legend>
        <p className={forms.hint}>Never shown on the site.</p>
        <div className={forms.grid}>
          <TextField
            name="email"
            label="Email"
            optional
            type="email"
            value={values.email}
            onChange={set('email')}
            maxLength={254}
            invalid={invalid('email')}
          />
          <TextField
            name="phone"
            label="Phone"
            optional
            type="tel"
            value={values.phone}
            onChange={set('phone')}
            maxLength={40}
            invalid={invalid('phone')}
          />
          <TextAreaField
            name="notes"
            label="Notes"
            optional
            wide
            value={values.notes}
            onChange={set('notes')}
            maxLength={2000}
            rows={2}
            invalid={invalid('notes')}
            placeholder="How they came to write for us, what they cover, how they like to be edited."
          />
        </div>
      </fieldset>

      <div className={forms.actions}>
        <button type="submit" className={forms.button} disabled={pending || uploading}>
          {pending ? 'Saving…' : writer?.id ? 'Save' : 'Add writer'}
        </button>
        {state.message && state.field !== 'photo' && (
          <p className={state.status === 'error' ? forms.error : forms.payoff} role="status" aria-live="polite">
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}

/** Removing a writer, behind a second press. */
export function ArchiveWriter({ writerId, postCount }: { writerId: string; postCount: number }) {
  const [state, action, pending] = useActionState(archiveWriter, INITIAL);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" className={`${forms.button} ${forms.quiet}`} onClick={() => setOpen(true)}>
        Remove from the list
      </button>
    );
  }

  return (
    <form action={action} className={forms.form}>
      <input type="hidden" name="writerId" value={writerId} />
      <p className={forms.hint}>
        {postCount > 0
          ? `Their ${postCount === 1 ? 'article keeps' : `${postCount} articles keep`} the byline, without the bio and photo.`
          : 'They have no articles, so nothing on the site changes.'}
      </p>
      <div className={styles.confirmActions}>
        <button type="submit" className={`${forms.button} ${forms.danger}`} disabled={pending}>
          {pending ? 'Removing…' : 'Remove'}
        </button>
        <button type="button" className={`${forms.button} ${forms.quiet}`} onClick={() => setOpen(false)} disabled={pending}>
          Keep
        </button>
      </div>
      {state.status === 'error' && (
        <p className={forms.error} role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
