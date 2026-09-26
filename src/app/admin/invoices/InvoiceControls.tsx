'use client';

import React, { useActionState, useState } from 'react';
import {
  emailReceipt,
  cancelRefund,
  emailRefund,
  recordPayment,
  recordRefund,
  reversePayment,
  saveDraftInvoice,
  sendInvoice,
  voidInvoice,
  type BillingState,
  type RefundState,
} from './actions';
import { PAYMENT_METHODS } from '@/lib/console/billing-labels';
import { DateField, SelectField, TextAreaField, TextField } from '@/components/console/Fields';
import { formatMoney, moneyInput } from '@/lib/console/money';
import styles from '../Admin.module.css';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';
import { Select } from '@/components/console/Select';
import {
  MenuDivider,
  MenuItem,
  MenuLink,
  MenuList,
  MenuNote,
  MenuTitle,
  RowMenu,
} from '@/components/console/RowMenu';

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

export function SendInvoiceButton({
  invoiceId,
  sent,
  label,
}: {
  invoiceId: string;
  sent: boolean;
  /** In place of Send / Send again, e.g. for a copy of a paid invoice. */
  label?: string;
}) {
  const [state, action, pending] = useActionState(sendInvoice, INITIAL);

  return (
    <form action={action} className={styles.inlineForm}>
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <button
        type="submit"
        className={`${forms.button} ${sent || label ? forms.quiet : ''}`}
        disabled={pending}
      >
        {pending ? 'Sending…' : (label ?? (sent ? 'Send again' : 'Send to the client'))}
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
        <p className={forms.payoff}>Issues a numbered receipt straight away.</p>
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

/** The refund note's own page offers to email it, like a receipt. */
export function EmailRefundButton({ refundId }: { refundId: string }) {
  const [state, action, pending] = useActionState(emailRefund, INITIAL);

  return (
    <form action={action} className={table.actionGroup}>
      <input type="hidden" name="refundId" value={refundId} />
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

/**
 * A payment's actions, behind the "…" on its row: open or email its receipt,
 * record money sent back, or reverse it when it was recorded by mistake. The
 * two that need more than a press open their form in place.
 */
export function PaymentMenu({
  paymentId,
  receipt,
  reversed,
  refundable,
  refunded,
  currency,
  today,
}: {
  paymentId: string;
  receipt: { id: string; number: string } | null;
  reversed: boolean;
  /** What is left of this payment that can still be sent back, in minor units. */
  refundable: number;
  /** Some of it has been sent back already, so it cannot be a mistake. */
  refunded: boolean;
  currency: string;
  today: string;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'menu' | 'reverse' | 'refund'>('menu');
  const [emailState, email, emailing] = useActionState(emailReceipt, INITIAL);
  const [reverseState, reverse, reversing] = useActionState(
    async (previous: BillingState, formData: FormData) => {
      const result = await reversePayment(previous, formData);
      if (result.status === 'done') setView('menu');
      return result;
    },
    INITIAL,
  );
  const [refundState, refund, refunding] = useActionState(
    async (previous: RefundState, formData: FormData) => {
      const result = await recordRefund(previous, formData);
      if (result.status === 'done') setView('menu');
      return result;
    },
    INITIAL as RefundState,
  );
  const [refundEmailState, emailTheRefund, emailingRefund] = useActionState(emailRefund, INITIAL);
  const said = [refundEmailState, refundState, reverseState, emailState].find(
    (state) => state.message,
  );
  const justRefunded = refundState.status === 'done' ? refundState.refund : undefined;

  return (
    <RowMenu
      label={receipt ? `Payment with receipt ${receipt.number}` : 'Payment'}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setView('menu');
      }}
      wide={view !== 'menu'}
    >
      {view === 'reverse' && (
        <form action={reverse} className={forms.form}>
          <input type="hidden" name="paymentId" value={paymentId} />
          <MenuTitle>Reverse this payment?</MenuTitle>
          <TextAreaField
            name="reason"
            label="Why"
            rows={3}
            required
            maxLength={500}
            placeholder="Recorded against the wrong invoice"
            hint="For a payment recorded by mistake. Shown on the receipt, which the client can see. To fix an amount, reverse it, then record the right one."
          />
          <div className={forms.actions}>
            <button
              type="submit"
              className={`${forms.button} ${forms.danger}`}
              disabled={reversing}
            >
              {reversing ? 'Reversing…' : 'Reverse it'}
            </button>
            <button
              type="button"
              className={`${forms.button} ${forms.quiet}`}
              onClick={() => setView('menu')}
            >
              Keep it
            </button>
          </div>
          {reverseState.status === 'error' && <Result state={reverseState} />}
        </form>
      )}

      {view === 'refund' && (
        <form action={refund} className={forms.form}>
          <input type="hidden" name="paymentId" value={paymentId} />
          <MenuTitle>Record money sent back</MenuTitle>
          <TextField
            name="amount"
            label={`Amount sent back (${currency})`}
            inputMode="decimal"
            required
            defaultValue={moneyInput(refundable, currency)}
            hint={`Up to ${formatMoney(refundable, currency)} from this payment.`}
          />
          <DateField
            name="receivedAt"
            label="Date it went back"
            defaultValue={today}
            max={today}
            required
          />
          <SelectField name="method" label="How it went back" defaultValue="mobile_money">
            {PAYMENT_METHODS.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </SelectField>
          <TextField
            name="reference"
            label="Reference"
            optional
            maxLength={120}
            placeholder="M-Pesa transaction id or bank reference"
          />
          <TextAreaField
            name="reason"
            label="Why"
            rows={2}
            required
            maxLength={500}
            placeholder="Project cancelled before work started"
            hint="Shown on the refund note, which the client can see."
          />
          <div className={forms.actions}>
            <button type="submit" className={forms.button} disabled={refunding}>
              {refunding ? 'Recording…' : 'Record the refund'}
            </button>
            <button
              type="button"
              className={`${forms.button} ${forms.quiet}`}
              onClick={() => setView('menu')}
            >
              Cancel
            </button>
          </div>
          {refundState.status === 'error' && <Result state={refundState} />}
        </form>
      )}

      {view === 'menu' && (
        <>
          <MenuList>
            {receipt && <MenuLink href={`/receipts/${receipt.number}`}>View the receipt</MenuLink>}
            {receipt && !reversed && (
              <form action={email}>
                <input type="hidden" name="receiptId" value={receipt.id} />
                <MenuItem type="submit" disabled={emailing}>
                  {emailing ? 'Sending…' : 'Email the receipt'}
                </MenuItem>
              </form>
            )}
            {justRefunded && (
              <>
                <MenuLink href={`/refunds/${justRefunded.number}`}>
                  View refund note {justRefunded.number}
                </MenuLink>
                <form action={emailTheRefund}>
                  <input type="hidden" name="refundId" value={justRefunded.id} />
                  <MenuItem type="submit" disabled={emailingRefund}>
                    {emailingRefund ? 'Sending…' : 'Email the refund note'}
                  </MenuItem>
                </form>
              </>
            )}
            {!reversed && (refundable > 0 || !refunded) && <MenuDivider />}
            {!reversed && refundable > 0 && (
              <MenuItem onClick={() => setView('refund')}>Record a refund</MenuItem>
            )}
            {!reversed && !refunded && (
              <MenuItem danger onClick={() => setView('reverse')}>
                Reverse this payment
              </MenuItem>
            )}
          </MenuList>
          {said?.message && (
            <MenuNote tone={said.status === 'error' ? 'bad' : 'quiet'}>{said.message}</MenuNote>
          )}
        </>
      )}
    </RowMenu>
  );
}

/** A refund's actions, behind the "…" on its row: open or email its note. */
export function RefundMenu({
  refundId,
  number,
  cancelled,
}: {
  refundId: string;
  number: string;
  cancelled: boolean;
}) {
  const [state, action, pending] = useActionState(emailRefund, INITIAL);
  const [cancelState, cancel, cancelling] = useActionState(cancelRefund, INITIAL);
  const [open, setOpen] = useState(false);
  const [asking, setAsking] = useState(false);
  const said = [state, cancelState].find((answer) => answer.message);

  return (
    <RowMenu
      label={`Refund ${number}`}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setAsking(false);
      }}
      wide={asking}
    >
      {asking ? (
        <form action={cancel} className={forms.form}>
          <input type="hidden" name="refundId" value={refundId} />
          <MenuTitle>Cancel {number}? Use this when it was recorded by mistake.</MenuTitle>
          <TextField
            name="reason"
            label="Why"
            required
            minLength={4}
            maxLength={200}
            placeholder="Entered the wrong amount"
          />
          <div className={forms.actions}>
            <button type="submit" className={`${forms.button} ${forms.danger}`} disabled={cancelling}>
              {cancelling ? 'Cancelling…' : 'Cancel the refund'}
            </button>
            <button
              type="button"
              className={`${forms.button} ${forms.quiet}`}
              onClick={() => setAsking(false)}
            >
              Keep it
            </button>
          </div>
          <Result state={cancelState} />
        </form>
      ) : (
        <>
          <MenuList>
            <MenuLink href={`/refunds/${number}`}>View the refund note</MenuLink>
            {!cancelled && (
              <form action={action}>
                <input type="hidden" name="refundId" value={refundId} />
                <MenuItem type="submit" disabled={pending}>
                  {pending ? 'Sending…' : 'Email the refund note'}
                </MenuItem>
              </form>
            )}
            {!cancelled && (
              <>
                <MenuDivider />
                <MenuItem danger onClick={() => setAsking(true)}>
                  Cancel this refund
                </MenuItem>
              </>
            )}
          </MenuList>
          {said?.message && (
            <MenuNote tone={said.status === 'error' ? 'bad' : 'quiet'}>{said.message}</MenuNote>
          )}
        </>
      )}
    </RowMenu>
  );
}

/** The due date and notes, while the invoice is still a draft. */
export function DraftInvoiceDetails({
  invoiceId,
  dueAt,
  notes,
}: {
  invoiceId: string;
  /** As a date input value, or empty for due on receipt. */
  dueAt: string;
  notes: string;
}) {
  const [state, action, pending] = useActionState(saveDraftInvoice, INITIAL);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        className={`${forms.button} ${forms.quiet}`}
        onClick={() => setOpen(true)}
      >
        Change the due date or notes
      </button>
    );
  }

  return (
    <form action={action} className={forms.form}>
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <DateField
        name="dueAt"
        label="Due"
        optional
        defaultValue={dueAt}
        hint="Leave it empty for due on receipt."
      />
      <TextAreaField
        name="notes"
        label="Notes"
        optional
        rows={3}
        maxLength={2000}
        defaultValue={notes}
        hint="Printed on the invoice."
      />
      <div className={forms.actions}>
        <button type="submit" className={forms.button} disabled={pending}>
          {pending ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          className={`${forms.button} ${forms.quiet}`}
          onClick={() => setOpen(false)}
        >
          Done
        </button>
      </div>
      <Result state={state} />
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
