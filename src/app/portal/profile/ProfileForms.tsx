'use client';

import React, { useActionState } from 'react';
import { changePassword, saveMyDetails, type TeamState } from '../team/actions';
import forms from '@/styles/forms.module.css';

const INITIAL: TeamState = { status: 'idle' };

function Message({ state }: { state: TeamState }) {
  if (!state.message) return null;
  return (
    <p className={state.status === 'error' ? forms.error : forms.hint} role="status" aria-live="polite">
      {state.message}
    </p>
  );
}

export function DetailsForm({ name, role, phone }: { name: string; role: string | null; phone: string | null }) {
  const [state, action, pending] = useActionState(saveMyDetails, INITIAL);
  return (
    <form action={action} className={forms.form}>
      <div className={forms.grid}>
        <div className={forms.field}>
          <label className={forms.label} htmlFor="me-name">Name</label>
          <input id="me-name" name="name" className={forms.control} defaultValue={name} required maxLength={120} autoComplete="name" />
        </div>
        <div className={forms.field}>
          <label className={forms.label} htmlFor="me-role">
            Job title <span className={forms.optional}>(optional)</span>
          </label>
          <input id="me-role" name="role" className={forms.control} defaultValue={role ?? ''} maxLength={80} />
        </div>
        <div className={forms.field}>
          <label className={forms.label} htmlFor="me-phone">
            Phone <span className={forms.optional}>(optional)</span>
          </label>
          <input id="me-phone" name="phone" type="tel" className={forms.control} defaultValue={phone ?? ''} maxLength={40} autoComplete="tel" />
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

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, INITIAL);
  return (
    <form action={action} className={forms.form}>
      <div className={forms.grid}>
        <div className={forms.field}>
          <label className={forms.label} htmlFor="pw-current">Current password</label>
          <input id="pw-current" name="current" type="password" className={forms.control} required autoComplete="current-password" />
        </div>
        <div className={forms.field}>
          <label className={forms.label} htmlFor="pw-next">New password</label>
          <input id="pw-next" name="next" type="password" className={forms.control} required minLength={10} autoComplete="new-password" />
        </div>
      </div>
      <div className={forms.actions}>
        <button type="submit" className={`${forms.button} ${forms.quiet}`} disabled={pending}>
          {pending ? 'Changing…' : 'Change password'}
        </button>
        <Message state={state} />
      </div>
    </form>
  );
}
