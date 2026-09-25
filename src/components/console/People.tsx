'use client';

import React, { useActionState, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { TextField } from './Fields';
import { MenuDivider, MenuItem, MenuList, MenuNote, MenuTitle, RowMenu } from './RowMenu';
import forms from '@/styles/forms.module.css';
import styles from './People.module.css';

/**
 * Adding and managing the people at a client. Used by staff on the client
 * page and by clients on their own team page; each passes its own server
 * actions, which do their own checks.
 */

export type PeopleState = { status: 'idle' | 'sent' | 'done' | 'error'; message?: string };
type Action = (previous: PeopleState, formData: FormData) => Promise<PeopleState>;

const INITIAL: PeopleState = { status: 'idle' };

function Message({ state }: { state: PeopleState }) {
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

export function AddPerson({
  action,
  hidden,
  canSkipInvite = false,
  label = 'Add a person',
}: {
  action: Action;
  hidden: Record<string, string>;
  /** Staff may add someone for the record without inviting them yet. */
  canSkipInvite?: boolean;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (previous: PeopleState, formData: FormData) => {
      const result = await action(previous, formData);
      if (result.status !== 'error') setOpen(false);
      return result;
    },
    INITIAL,
  );

  if (!open) {
    return (
      <div className={styles.addClosed}>
        <button
          type="button"
          className={`${forms.button} ${forms.quiet}`}
          onClick={() => setOpen(true)}
        >
          <UserPlus size={16} strokeWidth={1.8} aria-hidden="true" />
          {label}
        </button>
        <Message state={state} />
      </div>
    );
  }

  return (
    <form action={formAction} className={`${forms.form} ${styles.addForm}`}>
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <div className={forms.grid}>
        <div className={forms.field}>
          <label className={forms.label} htmlFor="person-name">
            Name
          </label>
          <input id="person-name" name="name" className={forms.control} required maxLength={120} />
        </div>
        <div className={forms.field}>
          <label className={forms.label} htmlFor="person-email">
            Email
          </label>
          <input
            id="person-email"
            name="email"
            type="email"
            className={forms.control}
            required
            maxLength={254}
          />
        </div>
        <div className={forms.field}>
          <label className={forms.label} htmlFor="person-role">
            Job title <span className={forms.optional}>(optional)</span>
          </label>
          <input
            id="person-role"
            name="role"
            className={forms.control}
            maxLength={80}
            placeholder="Marketing lead"
          />
        </div>
        <div className={forms.field}>
          <label className={forms.label} htmlFor="person-phone">
            Phone <span className={forms.optional}>(optional)</span>
          </label>
          <input
            id="person-phone"
            name="phone"
            type="tel"
            className={forms.control}
            maxLength={40}
          />
        </div>
      </div>
      {canSkipInvite ? (
        <label className={forms.checkRow}>
          <input type="checkbox" name="invite" defaultChecked className={forms.check} />
          Email them an invitation to the portal
        </label>
      ) : (
        <input type="hidden" name="invite" value="on" />
      )}
      <div className={forms.actions}>
        <button type="submit" className={forms.button} disabled={pending}>
          {pending ? 'Adding…' : canSkipInvite ? 'Add' : 'Send invitation'}
        </button>
        <button
          type="button"
          className={`${forms.button} ${forms.quiet}`}
          onClick={() => setOpen(false)}
        >
          Cancel
        </button>
        <Message state={state} />
      </div>
    </form>
  );
}

type PersonView = 'menu' | 'edit' | 'setup' | 'remove';

/**
 * Everything that can be done to one person, behind the "…" on their row:
 * change their details, make a setup link, send an invitation or a sign-in
 * link, make them the main contact, or remove them. Choices that need more
 * than a press turn the panel into their form or question.
 */
export function PersonMenu({
  contact,
  hidden,
  invite,
  makeMain,
  remove,
  edit,
  setupLink,
}: {
  contact: {
    id: string;
    name: string;
    email: string | null;
    role: string | null;
    phone: string | null;
    isPrimary: boolean;
    activated: boolean;
    canSignIn: boolean;
  };
  hidden: Record<string, string>;
  invite?: Action;
  makeMain?: Action;
  remove?: Action;
  edit?: Action;
  /** Shown when "Make a setup link" is chosen, for someone not set up yet. */
  setupLink?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<PersonView>('menu');
  const noop: Action = async () => INITIAL;
  const [inviteState, inviteAction, inviting] = useActionState(invite ?? noop, INITIAL);
  const [mainState, mainAction, making] = useActionState(makeMain ?? noop, INITIAL);
  const [removeState, removeAction, removing] = useActionState(remove ?? noop, INITIAL);
  const [editState, editAction, saving] = useActionState(
    async (previous: PeopleState, formData: FormData) => {
      const result = await (edit ?? noop)(previous, formData);
      if (result.status === 'done') setView('menu');
      return result;
    },
    INITIAL,
  );

  const fields = (
    <>
      <input type="hidden" name="contactId" value={contact.id} />
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
    </>
  );

  // The latest answer from any of the choices, shown under the list.
  const said = [removeState, mainState, inviteState, editState].find((state) => state.message);
  const canInvite = invite && contact.canSignIn && contact.email;
  const canSetUp = setupLink && contact.canSignIn && !contact.activated;
  const canRemove = remove && !contact.isPrimary;
  const canMakeMain = makeMain && !contact.isPrimary;
  if (!edit && !canSetUp && !canInvite && !canMakeMain && !canRemove) return null;

  return (
    <RowMenu
      label={`Actions for ${contact.name}`}
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
            {edit && <MenuItem onClick={() => setView('edit')}>Change details</MenuItem>}
            {canSetUp && <MenuItem onClick={() => setView('setup')}>Make a setup link</MenuItem>}
            {canInvite && (
              <form action={inviteAction}>
                {fields}
                <MenuItem type="submit" disabled={inviting}>
                  {inviting
                    ? 'Sending…'
                    : contact.activated
                      ? 'Email a sign-in link'
                      : 'Email the invitation'}
                </MenuItem>
              </form>
            )}
            {canMakeMain && (
              <form action={mainAction}>
                {fields}
                <MenuItem type="submit" disabled={making}>
                  Make main contact
                </MenuItem>
              </form>
            )}
            {canRemove && (
              <>
                <MenuDivider />
                <MenuItem danger onClick={() => setView('remove')}>
                  Remove
                </MenuItem>
              </>
            )}
          </MenuList>
          {said?.message && (
            <MenuNote tone={said.status === 'error' ? 'bad' : 'quiet'}>{said.message}</MenuNote>
          )}
        </>
      )}

      {view === 'remove' && (
        <form action={removeAction}>
          {fields}
          <MenuTitle>Remove {contact.name}? They lose access to the portal.</MenuTitle>
          <div className={forms.actions}>
            <button type="submit" className={`${forms.button} ${forms.danger}`} disabled={removing}>
              {removing ? 'Removing…' : 'Remove'}
            </button>
            <button
              type="button"
              className={`${forms.button} ${forms.quiet}`}
              onClick={() => setView('menu')}
            >
              Keep
            </button>
          </div>
          {removeState.status === 'error' && <Message state={removeState} />}
        </form>
      )}

      {view === 'setup' && (
        <>
          {setupLink}
          <button
            type="button"
            className={`${forms.link} ${styles.back}`}
            onClick={() => setView('menu')}
          >
            Back
          </button>
        </>
      )}

      {view === 'edit' && (
        <form action={editAction} className={forms.form}>
          {fields}
          <TextField
            name="name"
            label="Name"
            defaultValue={contact.name}
            required
            maxLength={120}
          />
          <TextField
            name="email"
            label="Email"
            type="email"
            optional={!contact.email}
            required={contact.activated}
            defaultValue={contact.email ?? ''}
            maxLength={254}
            hint={contact.activated ? 'They sign in with this address.' : undefined}
          />

          <TextField
            name="role"
            label="Job title"
            optional
            defaultValue={contact.role ?? ''}
            maxLength={80}
          />
          <TextField
            name="phone"
            label="Phone"
            type="tel"
            optional
            defaultValue={contact.phone ?? ''}
            maxLength={40}
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
          {editState.status === 'error' && <Message state={editState} />}
        </form>
      )}
    </RowMenu>
  );
}
