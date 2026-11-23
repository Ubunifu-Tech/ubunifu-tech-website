'use client';

import { useActionState, useState } from 'react';
import { Callout } from '@/components/console/Callout';
import { TextField } from '@/components/console/Fields';
import {
  pauseProjectHosting,
  resumeProjectHosting,
  saveHostingLink,
  type HostingState,
} from './hosting-actions';
import styles from '../../Admin.module.css';
import forms from '@/styles/forms.module.css';

const INITIAL: HostingState = { status: 'idle' };

export type HostingView = {
  projectId: string;
  /** Owners link, pause and resume. Everyone else reads where it stands. */
  owner: boolean;
  /** Whether the console has a Vercel access token to act with. */
  configured: boolean;
  link: { id: string; name: string | null } | null;
  /** The day it was paused, as shown, or null while it is serving. */
  pausedOn: string | null;
  pause:
    | { allowed: true; invoiceNumber: string; dueOn: string; noticeOn: string }
    | { allowed: false; reason: string };
  /** A payment recorded since the pause, when there is one. */
  paidSince: { on: string; invoiceNumber: string } | null;
};

function Result({ state }: { state: HostingState }) {
  if (!state.message) return null;
  return (
    <p className={state.status === 'error' ? forms.error : forms.hint} role="status" aria-live="polite">
      {state.message}
    </p>
  );
}

/**
 * Where a project's site is hosted, and for owners the way to pause it over
 * an unpaid invoice and bring it back. Pause sits behind two presses: the
 * first says what it will do and why it is allowed.
 */
export function Hosting({ projectId, owner, configured, link, pausedOn, pause, paidSince }: HostingView) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [linkState, linkAction, linking] = useActionState(
    async (previous: HostingState, formData: FormData) => {
      const result = await saveHostingLink(previous, formData);
      if (result.status === 'done') setEditing(false);
      return result;
    },
    INITIAL,
  );
  const [pauseState, pauseAction, pausing] = useActionState(
    async (previous: HostingState, formData: FormData) => {
      const result = await pauseProjectHosting(previous, formData);
      setConfirming(false);
      return result;
    },
    INITIAL,
  );
  const [resumeState, resumeAction, resuming] = useActionState(resumeProjectHosting, INITIAL);
  const site = link?.name ?? link?.id ?? '';
  const state = !link ? 'Not linked' : pausedOn ? 'Paused' : 'Serving';
  const badge = !link ? '' : pausedOn ? forms.badgeBad : forms.badgeGood;

  const linkForm = (
    <form action={linkAction} className={forms.form}>
      <input type="hidden" name="projectId" value={projectId} />
      <TextField
        name="vercelProject"
        label="Vercel project id"
        defaultValue={link?.id ?? ''}
        placeholder="prj_"
        autoComplete="off"
        spellCheck={false}
        maxLength={100}
        disabled={linking}
        hint={
          link
            ? 'From the project’s Settings page on Vercel. Clear it to remove the link.'
            : 'From the project’s Settings page on Vercel.'
        }
      />
      <div className={forms.actions}>
        <button type="submit" className={forms.button} disabled={linking}>
          {linking ? 'Saving…' : 'Save link'}
        </button>
        {link && (
          <button
            type="button"
            className={`${forms.button} ${forms.quiet}`}
            disabled={linking}
            onClick={() => setEditing(false)}
          >
            Cancel
          </button>
        )}
      </div>
      {linkState.status === 'error' && <Result state={linkState} />}
    </form>
  );

  return (
    <section id="hosting" className={forms.card}>
      <div className={forms.cardHeader}>
        <h2 className={forms.cardTitle}>Hosting</h2>
        <span className={`${forms.badge} ${badge}`}>{state}</span>
      </div>
      <div className={styles.hosting}>
        {!link && !owner && <p className={styles.note}>No Vercel project is linked. An owner can link one.</p>}

        {!link && owner && (
          <div className={styles.hosting}>
            <p className={styles.note}>
              Link the Vercel project that serves this site. Its hosting can then be paused here if an
              invoice stays unpaid after the client has been told.
            </p>
            {linkForm}
          </div>
        )}

        {link && (
          <dl className={styles.dates}>
            <div>
              <dt>Vercel project</dt>
              <dd>{link.name ? `${link.name} (${link.id})` : link.id}</dd>
            </div>
            {pausedOn && (
              <div>
                <dt>Paused</dt>
                <dd>{pausedOn}</dd>
              </div>
            )}
          </dl>
        )}

        {link && !owner && (
          <p className={styles.note}>
            {pausedOn
              ? 'The site is offline. Only an owner can resume it.'
              : 'Only an owner can pause or resume hosting.'}
          </p>
        )}

        {link && owner && !configured && (
          <Callout kind="info">
            Pause and Resume need a Vercel access token. Add VERCEL_ACCESS_TOKEN to the console’s
            environment settings.
          </Callout>
        )}

        {link && owner && pausedOn && (
          <form action={resumeAction} className={forms.form}>
            <input type="hidden" name="projectId" value={projectId} />
            <p className={styles.note}>
              {paidSince
                ? `A payment on ${paidSince.invoiceNumber} was recorded on ${paidSince.on}, after the pause.`
                : 'No payment has been recorded since the pause.'}
            </p>
            <div className={forms.actions}>
              <button type="submit" className={forms.button} disabled={resuming}>
                {resuming ? 'Resuming…' : 'Resume hosting'}
              </button>
            </div>
            {resumeState.status === 'error' && <Result state={resumeState} />}
          </form>
        )}

        {link && owner && !pausedOn && !editing && (
          <div className={styles.hosting}>
            {pause.allowed ? (
              <p className={styles.note}>
                {pause.invoiceNumber} has been overdue since {pause.dueOn}, and the client was given
                notice on {pause.noticeOn}.
              </p>
            ) : (
              <p className={styles.note}>{pause.reason}</p>
            )}

            {pause.allowed && !confirming && (
              <div className={forms.actions}>
                <button
                  type="button"
                  className={`${forms.button} ${forms.danger}`}
                  onClick={() => setConfirming(true)}
                >
                  Pause hosting
                </button>
                <button type="button" className={forms.link} onClick={() => setEditing(true)}>
                  Change link
                </button>
              </div>
            )}

            {pause.allowed && confirming && (
              <form action={pauseAction} className={forms.form}>
                <input type="hidden" name="projectId" value={projectId} />
                <Callout
                  kind="warn"
                  title={`If you pause ${site}`}
                  items={[
                    'The site stops serving. Visitors see a page saying it is unavailable.',
                    'Nothing is deleted. Resume brings it back as it was.',
                    'The pause is recorded in Activity under your name.',
                  ]}
                />
                <div className={forms.actions}>
                  <button type="submit" className={`${forms.button} ${forms.danger}`} disabled={pausing}>
                    {pausing ? 'Pausing…' : 'Pause hosting now'}
                  </button>
                  <button
                    type="button"
                    className={`${forms.button} ${forms.quiet}`}
                    disabled={pausing}
                    onClick={() => setConfirming(false)}
                  >
                    Keep it serving
                  </button>
                </div>
              </form>
            )}

            {!pause.allowed && (
              <div className={forms.actions}>
                <button type="button" className={forms.link} onClick={() => setEditing(true)}>
                  Change link
                </button>
              </div>
            )}

            {pauseState.status === 'error' && <Result state={pauseState} />}
            {resumeState.status === 'done' && <Result state={resumeState} />}
            {linkState.status === 'done' && <Result state={linkState} />}
          </div>
        )}

        {link && owner && !pausedOn && editing && linkForm}
        {link && owner && pausedOn && pauseState.status === 'done' && <Result state={pauseState} />}
      </div>
    </section>
  );
}
