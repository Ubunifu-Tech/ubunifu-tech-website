'use client';

import React, { useActionState, useState } from 'react';
import {
  emailReceipt,
  recordPayment,
  sendInvoice,
  voidInvoice,
  type BillingState,
} from './actions';
import { PAYMENT_METHODS } from '@/lib/console/billing-labels';
import { DateField } from '@/components/console/Fields';
import styles from '../Admin.module.css';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';
import { Select } from '@/components/console/Select';

const INITIAL: BillingState = { status: 'idle' };

function Result({ state }: { state: BillingState }) {
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

export function SendInvoiceButton({ invoiceId, sent }: { invoiceId: string; sent: boolean }) {
  const [state, action, pending] = useActionState(sendInvoice, INITIAL);

  return (
    <form action={action} className={styles.inlineForm}>
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <button
        type="submit"
        className={`${forms.button} ${sent ? forms.quiet : ''}`}
        disabled={pending}
      >
        {pending ? 'Sending…' : sent ? 'Send again' : 'Send to the client'}
      </button>
      <Result state={state} />
    </form>
  );
}

/**
 * Recording money that has already arrived.
 *
 * Defaults to the full outstanding amount and to today, because that is what
 * most payments are — but both are editable, because a part payment made last
 * Friday is the case this exists for.
 */
export function RecordPaymentForm({
  invoiceId,
  outstanding,
  currency,
  today,
}: {
  invoiceId: string;
  outstanding: string;
  currency: string;
  today: string;
}) {
  const [state, action, pending] = useActionState(recordPayment, INITIAL);

  return (
    <form action={action} className={forms.form}>
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <div className={forms.grid}>
        <div className={forms.field}>
          <label className={forms.label} htmlFor="pay-amount">
            Amount received ({currency})
          </label>
          <input
            id="pay-amount"
            name="amount"
            defaultValue={outstanding}
            className={forms.control}
            inputMode="decimal"
            required
            disabled={pending}
          />
        </div>

        <DateField
          name="receivedAt"
          label="Date it arrived"
          defaultValue={today}
          max={today}
          required
          disabled={pending}
        />

        <div className={forms.field}>
          <label className={forms.label} htmlFor="pay-method">
            How it arrived
          </label>
          <Select
              id="pay-method"
              name="method"
              defaultValue="bank_transfer"
              options={PAYMENT_METHODS}
              disabled={pending}
            />
        </div>

        <div className={forms.field}>
          <label className={forms.label} htmlFor="pay-ref">
            Reference <span className={forms.optional}>(optional)</span>
          </label>
          <input
            id="pay-ref"
            name="reference"
            className={forms.control}
            maxLength={120}
            placeholder="Bank reference or M-Pesa transaction id"
            disabled={pending}
          />
          <p className={forms.hint}>
            What you would quote if the client asked us to find this payment again.
          </p>
        </div>
      </div>

      <div className={forms.actions}>
        <button type="submit" className={forms.button} disabled={pending}>
          {pending ? 'Recording…' : 'Record the payment'}
        </button>
        <p className={forms.payoff}>
          Issues a numbered receipt straight away.
        </p>
      </div>
      <Result state={state} />
    </form>
  );
}

export function EmailReceiptButton({ receiptId }: { receiptId: string }) {
  const [state, action, pending] = useActionState(emailReceipt, INITIAL);

  return (
    <form action={action} className={table.actionGroup}>
      <input type="hidden" name="receiptId" value={receiptId} />
      <button type="submit" className={table.action} disabled={pending}>
        {pending ? 'Sending…' : 'Email it'}
      </button>
      {state.message && (
        <span className={state.status === 'error' ? forms.error : table.muted}>
          {state.message}
        </span>
      )}
    </form>
  );
}

/** Voiding asks for a reason before it will do anything. */
export function VoidInvoiceForm({ invoiceId }: { invoiceId: string }) {
  const [state, action, pending] = useActionState(voidInvoice, INITIAL);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        className={`${forms.button} ${forms.danger}`}
        onClick={() => setOpen(true)}
      >
        Void this invoice
      </button>
    );
  }

  return (
    <form action={action} className={forms.form}>
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <div className={forms.field}>
        <label className={forms.label} htmlFor="void-reason">
          Why is this being voided?
        </label>
        <input
          id="void-reason"
          name="reason"
          className={forms.control}
          required
          minLength={4}
          maxLength={200}
          placeholder="Raised against the wrong project"
          disabled={pending}
        />
        <p className={forms.hint}>
          The invoice keeps its number, and the reason is added to its notes.
        </p>
      </div>
      <div className={forms.actions}>
        <button type="submit" className={`${forms.button} ${forms.danger}`} disabled={pending}>
          {pending ? 'Voiding…' : 'Void it'}
        </button>
        <button
          type="button"
          className={`${forms.button} ${forms.quiet}`}
          onClick={() => setOpen(false)}
        >
          Keep it
        </button>
      </div>
      <Result state={state} />
    </form>
  );
}
