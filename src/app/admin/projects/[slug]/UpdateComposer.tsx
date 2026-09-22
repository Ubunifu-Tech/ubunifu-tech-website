'use client';

import React, { useActionState } from 'react';
import { publishUpdate, saveUpdate, type EditState } from './actions';
import styles from '../../Admin.module.css';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';

const INITIAL: EditState = { status: 'idle' };

export type UpdateRow = {
  id: string;
  title: string;
  body: string;
  previewUrl: string | null;
  published: boolean;
  when: string;
  notified: boolean;
};

function Result({ state }: { state: EditState }) {
  if (!state.message) return null;
  return (
    <p
      className={state.status === 'error' ? forms.error : forms.hint}
      role="status"
      aria-live="polite"
    >
      {state.message}
    </p>
  );
}

function PublishButton({ id }: { id: string }) {
  const [state, action, pending] = useActionState(publishUpdate, INITIAL);
  return (
    <form action={action} className={table.actionGroup}>
      <input type="hidden" name="updateId" value={id} />
      <button type="submit" className={table.action} disabled={pending}>
        {pending ? 'Sending…' : 'Send it'}
      </button>
      {state.message && (
        <span className={state.status === 'error' ? forms.error : table.muted}>
          {state.message}
        </span>
      )}
    </form>
  );
}

export function UpdateComposer({
  projectId,
  updates,
  readOnly = false,
}: {
  projectId: string;
  updates: UpdateRow[];
  /** For a role that can read updates but not send them. */
  readOnly?: boolean;
}) {
  const [state, action, pending] = useActionState(saveUpdate, INITIAL);

  return (
    <>
      {updates.length > 0 && (
        <div className={table.scroll}>
          <table className={`${table.table} ${table.compact}`}>
            <thead>
              <tr>
                <th className={table.th} scope="col">Update</th>
                <th className={table.th} scope="col">When</th>
                <th className={table.th} scope="col">State</th>
                <th className={`${table.th} ${table.actionsHead}`} scope="col">
                  <span className={table.muted}>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {updates.map((update) => (
                <tr key={update.id} className={table.tr}>
                  <td className={`${table.td} ${table.primary}`}>
                    {update.title}
                    <span className={table.sub}>
                      <span className={table.clamp}>{update.body}</span>
                    </span>
                  </td>
                  <td className={`${table.td} ${table.nowrap}`}>{update.when}</td>
                  <td className={table.td}>
                    <span
                      className={`${forms.badge} ${
                        update.published
                          ? update.notified
                            ? forms.badgeGood
                            : forms.badgeWarn
                          : ''
                      }`}
                    >
                      {update.published
                        ? update.notified
                          ? 'Sent'
                          : 'In their portal only'
                        : 'Draft'}
                    </span>
                  </td>
                  <td className={`${table.td} ${table.actions}`}>
                    {update.published || readOnly ? (
                      <span className={table.muted}>{update.published ? 'Nothing to do' : 'Draft'}</span>
                    ) : (
                      <PublishButton id={update.id} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!readOnly && (
      <form action={action} className={forms.form}>
        <input type="hidden" name="projectId" value={projectId} />
        <div className={forms.grid}>
          <div className={`${forms.field} ${forms.wide}`}>
            <label className={forms.label} htmlFor="update-title">
              What has happened
            </label>
            <input
              id="update-title"
              name="title"
              className={forms.control}
              maxLength={160}
              placeholder="Homepage design is ready for you to look at"
              disabled={pending}
            />
          </div>

          <div className={`${forms.field} ${forms.wide}`}>
            <label className={forms.label} htmlFor="update-body">
              In your own words
            </label>
            <textarea
              id="update-body"
              name="body"
              className={`${forms.control} ${forms.textarea}`}
              maxLength={8000}
              placeholder="Write it as you would say it on the phone. Leave a blank line between paragraphs."
              disabled={pending}
            />
            <p className={forms.hint}>
              This goes in the email itself.
            </p>
          </div>

          <div className={`${forms.field} ${forms.wide}`}>
            <label className={forms.label} htmlFor="update-link">
              Something to look at <span className={forms.optional}>(optional)</span>
            </label>
            <input
              id="update-link"
              name="previewUrl"
              type="url"
              className={forms.control}
              placeholder="https://"
              disabled={pending}
            />
          </div>
        </div>

        <div className={forms.actions}>
          <button type="submit" className={`${forms.button} ${forms.quiet}`} disabled={pending}>
            {pending ? 'Saving…' : 'Save as a draft'}
          </button>
          <p className={forms.payoff}>
            Nothing is sent until you press send.
          </p>
        </div>
        <Result state={state} />
      </form>
      )}

      {updates.length === 0 && (
        <p className={styles.note}>
          Nothing has been sent on this project yet.
        </p>
      )}
    </>
  );
}
