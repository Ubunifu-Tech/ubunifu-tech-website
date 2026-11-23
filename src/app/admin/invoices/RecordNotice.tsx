'use client';

import { useActionState, useState } from 'react';
import { DateField, SelectField, TextField } from '@/components/console/Fields';
import { NOTICE_CHANNELS } from '@/lib/console/hosting-rules';
import { recordNotice, type NoticeState } from './notice-actions';
import forms from '@/styles/forms.module.css';

const INITIAL: NoticeState = { status: 'idle' };

/**
 * Writing down that the client was told an invoice is overdue. Closed until
 * asked for, so the table of notices stays the thing on the page.
 */
export function RecordNotice({
  invoiceId,
  today,
  firstDay,
}: {
  invoiceId: string;
  /** Today in Tanzania, YYYY-MM-DD: a notice cannot be dated later. */
  today: string;
  /** The day after the due date: a notice cannot be dated earlier. */
  firstDay: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    async (previous: NoticeState, formData: FormData) => {
      const result = await recordNotice(previous, formData);
      if (result.status === 'done') setOpen(false);
      return result;
    },
    INITIAL,
  );

  if (!open) {
    return (
      <div className={`${forms.actions} ${forms.actionsBare}`}>
        <button type="button" className={`${forms.button} ${forms.quiet}`} onClick={() => setOpen(true)}>
          Record a notice
        </button>
        {state.status === 'done' && state.message && (
          <p className={forms.hint} role="status" aria-live="polite">
            {state.message}
          </p>
        )}
      </div>
    );
  }

  return (
    <form action={action} className={forms.form}>
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <div className={forms.grid}>
        <DateField
          name="givenAt"
          label="Day the client was told"
          defaultValue={today}
          min={firstDay}
          max={today}
          disabled={pending}
        />
        <SelectField name="channel" label="How they were told" defaultValue="email" disabled={pending}>
          {NOTICE_CHANNELS.map((channel) => (
            <option key={channel.value} value={channel.value}>
              {channel.label}
            </option>
          ))}
        </SelectField>
        <TextField
          name="note"
          label="Who was told, and what was said"
          optional
          wide
          maxLength={500}
          placeholder="Told Amina the invoice is two weeks late and hosting may be paused"
          disabled={pending}
        />
      </div>
      <div className={forms.actions}>
        <button type="submit" className={forms.button} disabled={pending}>
          {pending ? 'Recording…' : 'Record notice'}
        </button>
        <button
          type="button"
          className={`${forms.button} ${forms.quiet}`}
          disabled={pending}
          onClick={() => setOpen(false)}
        >
          Cancel
        </button>
      </div>
      {state.status === 'error' && state.message && (
        <p className={forms.error} role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
