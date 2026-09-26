'use client';

import { useActionState } from 'react';
import { saveExchangeRate, type FinanceState } from './actions';
import styles from '../Admin.module.css';
import forms from '@/styles/forms.module.css';

const INITIAL: FinanceState = { status: 'idle' };

/** One month's rate, asked the way people say it: 1 US$ = 2,450 TZS. */
export function RateForm({
  month,
  label,
  base,
  quote,
  rate,
}: {
  month: string;
  /** "Sept 2026". */
  label: string;
  base: string;
  quote: string;
  /** The rate already saved, if there is one. */
  rate: number | null;
}) {
  const [state, action, pending] = useActionState(saveExchangeRate, INITIAL);
  const id = `rate-${month}-${base}-${quote}`;
  return (
    <form action={action} className={styles.inlineForm}>
      <input type="hidden" name="month" value={month} />
      <input type="hidden" name="base" value={base} />
      <input type="hidden" name="quote" value={quote} />
      <label className={forms.label} htmlFor={id}>
        {label}: 1 {base} =
      </label>
      <span className={forms.affixWrap}>
        <input
          id={id}
          name="rate"
          className={`${forms.control} ${forms.number}`}
          inputMode="decimal"
          defaultValue={rate === null ? '' : String(Number(rate.toFixed(6)))}
          placeholder={base === 'USD' && quote === 'TZS' ? '2450' : undefined}
          required
          disabled={pending}
        />
        <span className={forms.affix} aria-hidden="true">
          {quote}
        </span>
      </span>
      <button type="submit" className={`${forms.button} ${forms.quiet}`} disabled={pending}>
        {pending ? 'Saving…' : 'Save'}
      </button>
      {state.message && (
        <span
          className={state.status === 'error' ? forms.error : forms.hint}
          role="status"
          aria-live="polite"
        >
          {state.message}
        </span>
      )}
    </form>
  );
}
