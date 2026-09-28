'use client';

import { useActionState, useState } from 'react';
import {
  discardUpdate,
  editUpdate,
  emailUpdateToRest,
  publishUpdate,
  putBackUpdate,
  saveUpdate,
  takeDownUpdate,
  type EditState,
} from './actions';
import { TextAreaField, TextField } from '@/components/console/Fields';
import {
  MenuBody,
  MenuDivider,
  MenuItem,
  MenuList,
  MenuNote,
  MenuTitle,
  RowMenu,
  useLastSaid,
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
  /** Taken down from the portal after it went out. */
  withdrawn: boolean;
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
  if (update.withdrawn) return { label: 'Taken down', tone: '' };
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

/**
 * One update's choices, whether it is still a draft or has gone out: read it
 * back, send it, change it or throw it away; then email the people it has not
 * reached, take it down or put it back.
 *
 * One component for both, so the row keeps it when the update turns from a
 * draft into a sent one underneath it, and the result of Send it (who was not
 * emailed, and why) stays on screen instead of going with the draft's menu.
 */
function UpdateMenu({ update }: { update: UpdateRow }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'menu' | 'read' | 'edit' | 'discard' | 'takeDown'>('menu');
  const [sendState, sendAction, sending] = useActionState(
    async (previous: EditState, formData: FormData) => {
      const result = await publishUpdate(previous, formData);
      setView('menu');
      return result;
    },
    INITIAL,
  );
  const [editState, editAction, saving] = useActionState(
    async (previous: EditState, formData: FormData) => {
      const result = await editUpdate(previous, formData);
      if (result.status === 'done') setView('menu');
      return result;
    },
    INITIAL,
  );
  const [discardState, discardAction, discarding] = useActionState(discardUpdate, INITIAL);
  const [restState, sendRest, sendingRest] = useActionState(emailUpdateToRest, INITIAL);
  const [downState, takeDown, takingDown] = useActionState(
    async (previous: EditState, formData: FormData) => {
      const result = await takeDownUpdate(previous, formData);
      if (result.status === 'done') setView('menu');
      return result;
    },
    INITIAL,
  );
  const [backState, putBack, puttingBack] = useActionState(putBackUpdate, INITIAL);
  const said = useLastSaid(sendState, editState, discardState, restState, downState, backState);
  const draft = !update.published && !update.withdrawn;

  const sendIt = (
    <form action={sendAction}>
      <input type="hidden" name="updateId" value={update.id} />
      {view === 'read' ? (
        <button type="submit" className={forms.button} disabled={sending}>
          {sending ? 'Sending…' : 'Send it'}
        </button>
      ) : (
        <MenuItem type="submit" disabled={sending}>
          {sending ? 'Sending…' : 'Send it'}
        </MenuItem>
      )}
    </form>
  );

  return (
    <RowMenu
      label={`Actions for ${update.title}`}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setView('menu');
      }}
      wide={view !== 'menu'}
    >
      {view === 'menu' && (
        <>
          <MenuList>
            {draft ? (
              <>
                <MenuItem onClick={() => setView('read')}>Read it back</MenuItem>
                {sendIt}
                <MenuItem onClick={() => setView('edit')}>Edit</MenuItem>
                <MenuDivider />
                <MenuItem danger onClick={() => setView('discard')}>
                  Discard
                </MenuItem>
              </>
            ) : (
              <>
                {update.published && update.unreached > 0 && (
                  <form action={sendRest}>
                    <input type="hidden" name="updateId" value={update.id} />
                    <MenuItem type="submit" disabled={sendingRest}>
                      {sendingRest
                        ? 'Sending…'
                        : update.reached > 0
                          ? 'Send to the rest'
                          : 'Email it'}
                    </MenuItem>
                  </form>
                )}
                {update.withdrawn && (
                  <form action={putBack}>
                    <input type="hidden" name="updateId" value={update.id} />
                    <MenuItem type="submit" disabled={puttingBack}>
                      {puttingBack ? 'Putting it back…' : 'Put it back in their portal'}
                    </MenuItem>
                  </form>
                )}
                {update.published && (
                  <>
                    {update.unreached > 0 && <MenuDivider />}
                    <MenuItem danger onClick={() => setView('takeDown')}>
                      Take it down
                    </MenuItem>
                  </>
                )}
              </>
            )}
          </MenuList>
          {said?.message && (
            <MenuNote tone={said.status === 'error' ? 'bad' : 'quiet'}>{said.message}</MenuNote>
          )}
        </>
      )}

      {view === 'read' && (
        <>
          <MenuTitle>{update.title}</MenuTitle>
          <MenuBody>
            <p className={styles.quote}>{update.body}</p>
            {update.previewUrl && (
              <p className={forms.hint}>
                <a
                  href={update.previewUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={forms.link}
                >
                  {update.previewUrl}
                </a>
              </p>
            )}
          </MenuBody>
          <div className={forms.actions}>
            {sendIt}
            <button
              type="button"
              className={`${forms.button} ${forms.quiet}`}
              onClick={() => setView('edit')}
            >
              Edit
            </button>
          </div>
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
            minLength={3}
            maxLength={160}
          />
          <TextAreaField
            name="body"
            label="In your own words"
            defaultValue={update.body}
            required
            rows={6}
            minLength={10}
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

      {view === 'takeDown' && (
        <form action={takeDown} className={forms.form}>
          <input type="hidden" name="updateId" value={update.id} />
          <MenuTitle>
            Take it out of their portal? Emails already sent stay in their inbox.
          </MenuTitle>
          <div className={forms.actions}>
            <button type="submit" className={`${forms.button} ${forms.danger}`} disabled={takingDown}>
              {takingDown ? 'Taking it down…' : 'Take it down'}
            </button>
            <button
              type="button"
              className={`${forms.button} ${forms.quiet}`}
              onClick={() => setView('menu')}
            >
              Keep it
            </button>
          </div>
          <Result state={downState.status === 'error' ? downState : INITIAL} />
        </form>
      )}
    </RowMenu>
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
  // Kept in state so a refused save does not wipe them: React resets a form
  // after its action runs, error or not. Cleared only once it has saved.
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state.status === 'done') {
      setTitle('');
      setBody('');
      setLink('');
    }
  }

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
                  Message
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
                  <td className={`${table.td} ${table.primary}`}>{update.title}</td>
                  <td className={table.td}>
                    <span className={table.clamp}>{update.body}</span>
                  </td>
                  <td className={`${table.td} ${table.nowrap}`}>{update.when}</td>
                  <td className={table.td}>
                    <span className={`${forms.badge} ${sentState(update).tone}`}>
                      {sentState(update).label}
                    </span>
                  </td>
                  <td className={`${table.td} ${table.actions}`}>
                    {readOnly ? null : <UpdateMenu update={update} />}
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
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                minLength={3}
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
                value={body}
                onChange={(event) => setBody(event.target.value)}
                required
                minLength={10}
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
                value={link}
                onChange={(event) => setLink(event.target.value)}
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
      {readOnly && <p className={styles.note}>Someone who runs projects writes and sends these.</p>}
    </>
  );
}
