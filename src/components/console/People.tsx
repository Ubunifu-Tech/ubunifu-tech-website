'use client';

import React, { useActionState, useState } from 'react';
import { UserPlus } from 'lucide-react';
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
    <p className={state.status === 'error' ? forms.error : forms.hint} role="status" aria-live="polite">
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
  const [state, formAction, pending] = useActionState(async (previous: PeopleState, formData: FormData) => {
    const result = await action(previous, formData);
    if (result.status !== 'error') setOpen(false);
    return result;
  }, INITIAL);

  if (!open) {
    return (
      <div className={styles.addClosed}>
        <button type="button" className={`${forms.button} ${forms.quiet}`} onClick={() => setOpen(true)}>
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
          <input id="person-email" name="email" type="email" className={forms.control} required maxLength={254} />
        </div>
        <div className={forms.field}>
          <label className={forms.label} htmlFor="person-role">
            Job title <span className={forms.optional}>(optional)</span>
          </label>
          <input id="person-role" name="role" className={forms.control} maxLength={80} placeholder="Marketing lead" />
        </div>
        <div className={forms.field}>
          <label className={forms.label} htmlFor="person-phone">
            Phone <span className={forms.optional}>(optional)</span>
          </label>
          <input id="person-phone" name="phone" type="tel" className={forms.control} maxLength={40} />
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
        <button type="button" className={`${forms.button} ${forms.quiet}`} onClick={() => setOpen(false)}>
          Cancel
        </button>
        <Message state={state} />
      </div>
    </form>
  );
}

export function PersonActions({
  contactId,
  isPrimary,
  activated,
  canSignIn,
  hidden,
  invite,
  makeMain,
  remove,
}: {
  contactId: string;
  isPrimary: boolean;
  activated: boolean;
  canSignIn: boolean;
  hidden: Record<string, string>;
  invite?: Action;
  makeMain?: Action;
  remove?: Action;
}) {
  const [inviteState, inviteAction, inviting] = useActionState(invite ?? (async () => INITIAL), INITIAL);
  const [mainState, mainAction, making] = useActionState(makeMain ?? (async () => INITIAL), INITIAL);
  const [removeState, removeAction, removing] = useActionState(remove ?? (async () => INITIAL), INITIAL);
  const [confirming, setConfirming] = useState(false);

  const fields = (
    <>
      <input type="hidden" name="contactId" value={contactId} />
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
    </>
  );

  const shown = [removeState, mainState, inviteState].find((state) => state.message);

  return (
    <div className={styles.actions}>
      {confirming ? (
        <form action={removeAction} className={styles.inline}>
          {fields}
          <span className={styles.confirm}>Remove their access?</span>
          <button type="submit" className={`${forms.link} ${styles.danger}`} disabled={removing}>
            Remove
          </button>
          <button type="button" className={forms.link} onClick={() => setConfirming(false)}>
            Keep
          </button>
        </form>
      ) : (
        <>
          {invite && canSignIn && (
            <form action={inviteAction}>
              {fields}
              <button type="submit" className={forms.link} disabled={inviting}>
                {inviting ? 'Sending…' : activated ? 'Send sign-in link' : 'Send invitation'}
              </button>
            </form>
          )}
          {makeMain && !isPrimary && (
            <form action={mainAction}>
              {fields}
              <button type="submit" className={forms.link} disabled={making}>
                Make main contact
              </button>
            </form>
          )}
          {remove && !isPrimary && (
            <button type="button" className={`${forms.link} ${styles.danger}`} onClick={() => setConfirming(true)}>
              Remove
            </button>
          )}
        </>
      )}
      {shown && <Message state={shown} />}
    </div>
  );
}
