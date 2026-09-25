'use client';

import React, { useActionState, useState } from 'react';
import {
  discardUpdate,
  editUpdate,
  emailUpdateToRest,
  publishUpdate,
  saveUpdate,
  type EditState,
} from './actions';
import { TextAreaField, TextField } from '@/components/console/Fields';
import {
  MenuDivider,
  MenuItem,
  MenuList,
  MenuNote,
  MenuTitle,
  RowMenu,
} from '@/components/console/RowMenu';
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
  /** Addresses it was emailed to. */
  reached: number;
  /** People who could be emailed today and have not been. */
  unreached: number;
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

/** Where a published update stands, from who it actually reached. */
function sentState(update: UpdateRow): { label: string; tone: string } {
  if (!update.published) return { label: 'Draft', tone: '' };
  const everyone = update.reached + update.unreached;
  if (update.unreached === 0) {
    return update.reached > 0
      ? { label: 'Emailed', tone: forms.badgeGood }
      : { label: 'In their portal', tone: '' };
  }
  return update.reached > 0
    ? { label: `Emailed ${update.reached} of ${everyone}`, tone: forms.badgeWarn }
    : { label: 'Not emailed', tone: forms.badgeWarn };
}

/** A draft's choices: send it, change it, or throw it away. */
function DraftMenu({ update }: { update: UpdateRow }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'menu' | 'edit' | 'discard'>('menu');
  const [sendState, sendAction, sending] = useActionState(publishUpdate, INITIAL);
  const [editState, editAction, saving] = useActionState(
    async (previous: EditState, formData: FormData) => {
      const result = await editUpdate(previous, formData);
      if (result.status === 'done') setView('menu');
      return result;
    },
    INITIAL,
  );
  const [discardState, discardAction, discarding] = useActionState(discardUpdate, INITIAL);
  const said = [sendState, editState, discardState].find((state) => state.message);

  return (
    <RowMenu
      label={`Actions for ${update.title}`}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setView('menu');
      }}
      wide={view === 'edit'}
    >
      {view === 'menu' && (
        <>
          <MenuList>
            <form action={sendAction}>
              <input type="hidden" name="updateId" value={update.id} />
              <MenuItem type="submit" disabled={sending}>
                {sending ? 'Sending…' : 'Send it'}
              </MenuItem>
            </form>
            <MenuItem onClick={() => setView('edit')}>Edit</MenuItem>
            <MenuDivider />
            <MenuItem danger onClick={() => setView('discard')}>
              Discard
            </MenuItem>
          </MenuList>
          {said?.message && (
            <MenuNote tone={said.status === 'error' ? 'bad' : 'quiet'}>{said.message}</MenuNote>
          )}
        </>
      )}

      {view === 'edit' && (
        <form action={editAction} className={forms.form}>
          <input type="hidden" name="updateId" value={update.id} />
          <TextField
            name="title"
            label="What has happened"
            defaultValue={update.title}
            required
            maxLength={160}
          />
          <TextAreaField
            name="body"
            label="In your own words"
            defaultValue={update.body}
            required
            rows={6}
            maxLength={8000}
          />
          <TextField
            name="previewUrl"
            label="Something to look at"
            type="url"
            optional
            defaultValue={update.previewUrl ?? ''}
            placeholder="https://"
          />
          <div className={forms.actions}>
            <button type="submit" className={forms.button} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              className={`${forms.button} ${forms.quiet}`}
              onClick={() => setView('menu')}
            >
              Cancel
            </button>
          </div>
          <Result state={editState.status === 'error' ? editState : INITIAL} />
        </form>
      )}

      {view === 'discard' && (
        <form action={discardAction}>
          <input type="hidden" name="updateId" value={update.id} />
          <MenuTitle>Discard this draft? It has not been sent to anyone.</MenuTitle>
          <div className={forms.actions}>
            <button
              type="submit"
              className={`${forms.button} ${forms.danger}`}
              disabled={discarding}
            >
              {discarding ? 'Discarding…' : 'Discard'}
            </button>
            <button
              type="button"
              className={`${forms.button} ${forms.quiet}`}
              onClick={() => setView('menu')}
            >
              Keep
            </button>
          </div>
          <Result state={discardState.status === 'error' ? discardState : INITIAL} />
        </form>
      )}
    </RowMenu>
  );
}

/** For a published update some people have not been emailed. */
function SendToRest({ update }: { update: UpdateRow }) {
  const [state, action, pending] = useActionState(emailUpdateToRest, INITIAL);
  return (
    <form action={action} className={table.actionGroup}>
      <input type="hidden" name="updateId" value={update.id} />
      {state.message && (
        <span className={state.status === 'error' ? forms.error : table.muted}>
          {state.message}
        </span>
      )}
      <button type="submit" className={table.action} disabled={pending}>
        {pending ? 'Sending…' : update.reached > 0 ? 'Send to the rest' : 'Email it'}
      </button>
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
                <th className={table.th} scope="col">
                  Update
                </th>
                <th className={table.th} scope="col">
                  When
                </th>
                <th className={table.th} scope="col">
                  State
                </th>
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
                    <span className={`${forms.badge} ${sentState(update).tone}`}>
                      {sentState(update).label}
                    </span>
                  </td>
                  <td className={`${table.td} ${table.actions}`}>
                    {readOnly ? null : !update.published ? (
                      <DraftMenu update={update} />
                    ) : update.unreached > 0 ? (
                      <SendToRest update={update} />
                    ) : null}
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
                They read this in their portal, and in the email to anyone with an address.
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
            <p className={forms.payoff}>Nothing is sent until you press send.</p>
          </div>
          <Result state={state} />
        </form>
      )}

      {updates.length === 0 && (
        <p className={styles.note}>Nothing has been sent on this project yet.</p>
      )}
    </>
  );
}
