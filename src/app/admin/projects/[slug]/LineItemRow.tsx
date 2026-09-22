'use client';

import React, { useActionState } from 'react';
import { saveLineItem, type EditState } from './actions';
import styles from '../../Admin.module.css';
import forms from '@/styles/forms.module.css';

const INITIAL: EditState = { status: 'idle' };

const STATUSES = [
  { value: 'planned', label: 'Planned' },
  { value: 'active', label: 'Active' },
  { value: 'deferred', label: 'Deferred' },
  { value: 'paused', label: 'Paused' },
  { value: 'waived', label: 'Waived' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function LineItemRow({
  id,
  label,
  terms,
  amount,
  currency,
  status,
  recurring,
  nextDueAt,
}: {
  id: string;
  label: string;
  terms: string | null;
  amount: string;
  currency: string;
  status: string;
  recurring: boolean;
  nextDueAt: string;
}) {
  const [state, action, pending] = useActionState(saveLineItem, INITIAL);

  return (
    <form action={action} className={styles.lineRow}>
      <input type="hidden" name="lineItemId" value={id} />

      <div>
        <span className={styles.lineLabel}>{label}</span>
        {terms && <p className={styles.lineTerms}>{terms}</p>}
        {state.status === 'error' && (
          <p className={forms.error} role="alert">
            {state.message}
          </p>
        )}
      </div>

      <div className={forms.field}>
        <label className={forms.label} htmlFor={`amount-${id}`}>
          {currency}
        </label>
        <input
          id={`amount-${id}`}
          name="amount"
          defaultValue={amount}
          className={forms.control}
          inputMode="decimal"
          placeholder="0.00"
          disabled={pending}
        />
      </div>

      <div className={forms.field}>
        <label className={forms.label} htmlFor={`due-${id}`}>
          {recurring ? 'Renews on' : 'Not recurring'}
        </label>
        <input
          id={`due-${id}`}
          name="nextDueAt"
          type="date"
          defaultValue={nextDueAt}
          className={`${forms.control} ${forms.date}`}
          disabled={pending || !recurring}
        />
      </div>

      <div className={forms.field}>
        <label className={forms.label} htmlFor={`status-${id}`}>
          State
        </label>
        <span className={forms.selectWrap}>
          <select
            id={`status-${id}`}
            name="lineStatus"
            defaultValue={status}
            className={`${forms.control} ${forms.select}`}
            disabled={pending}
          >
            {STATUSES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </span>
      </div>

      <button type="submit" className={`${forms.button} ${forms.quiet}`} disabled={pending}>
        {pending ? 'Saving…' : state.status === 'done' ? 'Saved' : 'Save'}
      </button>
    </form>
  );
}
