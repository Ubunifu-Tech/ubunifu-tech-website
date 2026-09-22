'use client';

import React, { useActionState, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Select } from '@/components/console/Select';
import { ROLE_OPTIONS } from '@/lib/console/people';
import {
  changeRole,
  inviteStaff,
  resendInvite,
  saveProfile,
  savePermissions,
  setActive,
  type TeamState,
} from './actions';
import forms from '@/styles/forms.module.css';
import styles from './Team.module.css';

const INITIAL: TeamState = { status: 'idle' };

function Message({ state }: { state: TeamState }) {
  if (!state.message) return null;
  return (
    <p className={state.status === 'error' ? forms.error : forms.hint} role="status" aria-live="polite">
      {state.message}
    </p>
  );
}

/** "Invite someone", opening into a short form. */
export function InviteStaff({ domains }: { domains: string[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(inviteStaff, INITIAL);

  if (!open) {
    return (
      <button type="button" className={forms.button} onClick={() => setOpen(true)}>
        <UserPlus size={16} strokeWidth={1.8} aria-hidden="true" />
        Invite someone
      </button>
    );
  }

  return (
    <form action={action} className={`${forms.form} ${styles.inviteForm}`}>
      <div className={forms.grid}>
        <div className={forms.field}>
          <label className={forms.label} htmlFor="invite-name">
            Name
          </label>
          <input id="invite-name" name="name" className={forms.control} required maxLength={120} autoComplete="off" />
        </div>
        <div className={forms.field}>
          <label className={forms.label} htmlFor="invite-email">
            Email
          </label>
          <input
            id="invite-email"
            name="email"
            type="email"
            className={forms.control}
            required
            placeholder={domains[0] ? `name${domains[0]}` : undefined}
            autoComplete="off"
          />
        </div>
        <div className={forms.field}>
          <label className={forms.label} htmlFor="invite-title">
            What they do <span className={forms.optional}>(optional)</span>
          </label>
          <input id="invite-title" name="title" className={forms.control} maxLength={80} placeholder="Designer" />
        </div>
        <div className={forms.field}>
          <label className={forms.label} htmlFor="invite-role">
            Role
          </label>
          <Select id="invite-role" name="role" defaultValue="member" options={ROLE_OPTIONS} />
        </div>
      </div>
      <div className={forms.actions}>
        <button type="submit" className={forms.button} disabled={pending}>
          {pending ? 'Sending…' : 'Send invitation'}
        </button>
        <button type="button" className={`${forms.button} ${forms.quiet}`} onClick={() => setOpen(false)}>
          Cancel
        </button>
        <Message state={state} />
      </div>
    </form>
  );
}

export function RoleControl({ staffId, role }: { staffId: string; role: string }) {
  const [state, action] = useActionState(changeRole, INITIAL);
  return (
    <form action={action} className={styles.inline}>
      <input type="hidden" name="staffId" value={staffId} />
      <Select name="role" defaultValue={role} options={ROLE_OPTIONS} size="sm" autoSubmit aria-label="Role" />
      {state.status === 'error' && <Message state={state} />}
    </form>
  );
}

export function RowActions({
  staffId,
  active,
  invited,
}: {
  staffId: string;
  active: boolean;
  invited: boolean;
}) {
  const [resendState, resend, resending] = useActionState(resendInvite, INITIAL);
  const [activeState, toggle, toggling] = useActionState(setActive, INITIAL);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className={styles.actions}>
      {active && invited && (
        <form action={resend}>
          <input type="hidden" name="staffId" value={staffId} />
          <button type="submit" className={forms.link} disabled={resending}>
            {resending ? 'Sending…' : 'Resend invitation'}
          </button>
        </form>
      )}
      {active && !confirming && (
        <button type="button" className={`${forms.link} ${styles.danger}`} onClick={() => setConfirming(true)}>
          Remove
        </button>
      )}
      {(!active || confirming) && (
        <form action={toggle} className={styles.inline}>
          <input type="hidden" name="staffId" value={staffId} />
          <input type="hidden" name="active" value={active ? 'false' : 'true'} />
          {confirming && <span className={styles.confirmText}>Remove from the team?</span>}
          <button type="submit" className={`${forms.link} ${active ? styles.danger : ''}`} disabled={toggling}>
            {active ? 'Remove' : 'Restore'}
          </button>
          {confirming && (
            <button type="button" className={forms.link} onClick={() => setConfirming(false)}>
              Keep
            </button>
          )}
        </form>
      )}
      <Message state={resendState.status === 'idle' ? activeState : resendState} />
    </div>
  );
}

export function ProfileForm({ name, title }: { name: string; title: string | null }) {
  const [state, action, pending] = useActionState(saveProfile, INITIAL);
  return (
    <form action={action} className={forms.form}>
      <div className={forms.grid}>
        <div className={forms.field}>
          <label className={forms.label} htmlFor="profile-name">
            Name
          </label>
          <input id="profile-name" name="name" className={forms.control} defaultValue={name} required maxLength={120} />
        </div>
        <div className={forms.field}>
          <label className={forms.label} htmlFor="profile-title">
            What you do <span className={forms.optional}>(optional)</span>
          </label>
          <input
            id="profile-title"
            name="title"
            className={forms.control}
            defaultValue={title ?? ''}
            maxLength={80}
            placeholder="Developer"
          />
        </div>
      </div>
      <div className={forms.actions}>
        <button type="submit" className={forms.button} disabled={pending}>
          {pending ? 'Saving…' : 'Save'}
        </button>
        <Message state={state} />
      </div>
    </form>
  );
}

/**
 * What each role may do, as a grid of switches. Owners always have every
 * permission, so their column is fixed; only owners can change the others.
 */
export function PermissionsGrid({
  permissions,
  granted,
  editable,
}: {
  permissions: readonly { key: string; label: string; description: string }[];
  granted: { admin: readonly string[]; member: readonly string[] };
  editable: boolean;
}) {
  const [state, action, pending] = useActionState(savePermissions, INITIAL);

  return (
    <form action={action} className={styles.permissions}>
      <div className={styles.permissionsScroll}>
        <table className={styles.grid}>
          <thead>
            <tr>
              <th scope="col">Permission</th>
              <th scope="col">Member</th>
              <th scope="col">Admin</th>
              <th scope="col">Owner</th>
            </tr>
          </thead>
          <tbody>
            {permissions.map((permission) => (
              <tr key={permission.key}>
                <th scope="row">
                  <span className={styles.permissionLabel}>{permission.label}</span>
                  <span className={styles.permissionText}>{permission.description}</span>
                </th>
                {(['member', 'admin'] as const).map((role) => (
                  <td key={role}>
                    <input
                      type="checkbox"
                      name={`${role}:${permission.key}`}
                      defaultChecked={granted[role].includes(permission.key)}
                      disabled={!editable}
                      className={forms.check}
                      aria-label={`${role === 'admin' ? 'Admin' : 'Member'}: ${permission.label}`}
                    />
                  </td>
                ))}
                <td>
                  <input
                    type="checkbox"
                    checked
                    disabled
                    readOnly
                    className={forms.check}
                    aria-label={`Owner: ${permission.label}, always`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editable && (
        <div className={forms.actions}>
          <button type="submit" className={forms.button} disabled={pending}>
            {pending ? 'Saving…' : 'Save permissions'}
          </button>
          <Message state={state} />
        </div>
      )}
    </form>
  );
}
