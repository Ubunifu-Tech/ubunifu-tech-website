'use client';

import React, { useActionState, useState } from 'react';
import Link from 'next/link';
import {
  emailReceipt,
  recordEarlyPayment,
  type BillingState,
  type EarlyPaymentState,
} from '../../invoices/actions';
import { formatMoney, moneyInput } from '@/lib/console/money';
import { PAYMENT_METHODS } from '@/lib/console/billing-labels';
import { DateField, SelectField, TextField } from '@/components/console/Fields';
import type { BillableLine } from './RaiseInvoice';
import styles from '../../Admin.module.css';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';

const INITIAL: EarlyPaymentState = { status: 'idle' };

/**
 * Money that came in before an invoice was raised, or before anything was
 * signed. Staff pick the fees it covers and say what arrived; the invoice and
 * the receipt are made together, and the receipt can go straight out.
 */
export function EarlyPayment({
  projectId,
  lines,
  today,
}: {
  projectId: string;
  lines: BillableLine[];
  today: string;
}) {
  const [state, action, pending] = useActionState(recordEarlyPayment, INITIAL);
  const [chosen, setChosen] = useState<string[]>([]);
  // The amount follows the fees picked until someone types their own.
  const [typed, setTyped] = useState<string | null>(null);
  const [done, setDone] = useState<EarlyPaymentState | null>(null);
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state.status === 'done') {
      setDone(state);
      setChosen([]);
      setTyped(null);
    }
  }

  if (done?.receipt) {
    return <Recorded state={done} onAnother={() => setDone(null)} />;
  }

  if (lines.length === 0) {
    return (
      <p className={styles.note}>
        Every priced fee is already on an invoice. Record the payment on that invoice instead.
      </p>
    );
  }

  const picked = lines.filter((line) => chosen.includes(line.key));
  const currencies = [...new Set(picked.map((line) => line.currency))];
  const currency = currencies[0] ?? lines[0]!.currency;
  const total = picked.reduce((sum, line) => sum + line.amountMinor, 0);
  const mixed = currencies.length > 1;
  const amount = typed ?? (total > 0 ? moneyInput(total, currency) : '');

  const toggle = (key: string) =>
    setChosen((current) =>
      current.includes(key) ? current.filter((value) => value !== key) : [...current, key],
    );

  return (
    <form action={action} className={forms.form}>
      <input type="hidden" name="projectId" value={projectId} />

      <div className={table.scroll}>
        <table className={`${table.table} ${table.compact}`}>
          <thead>
            <tr>
              <th className={table.th} scope="col">
                Pays for
              </th>
              <th className={table.th} scope="col">
                Fee
              </th>
              <th className={`${table.th} ${table.numericHead}`} scope="col">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.key} className={table.tr}>
                <td className={table.td}>
                  <input
                    type="checkbox"
                    name="billables"
                    value={line.key}
                    className={forms.check}
                    checked={chosen.includes(line.key)}
                    onChange={() => toggle(line.key)}
                    aria-label={`It pays for ${line.label}${line.period ? `, ${line.period}` : ''}`}
                    disabled={pending}
                  />
                </td>
                <td className={`${table.td} ${table.primary}`}>
                  {line.label}
                  {line.period && <span className={table.sub}>{line.period}</span>}
                  {!line.period && line.terms && <span className={table.sub}>{line.terms}</span>}
                </td>
                <td className={`${table.td} ${table.numeric}`}>{line.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={forms.grid}>
        <TextField
          name="amount"
          label={`Amount received (${currency})`}
          inputMode="decimal"
          required
          value={amount}
          onChange={(event) => setTyped(event.target.value)}
          disabled={pending}
          hint={
            total > 0
              ? `Those fees come to ${formatMoney(total, currency)}. Less is fine; the rest stays owed.`
              : undefined
          }
        />
        <DateField
          name="receivedAt"
          label="Date it arrived"
          defaultValue={today}
          max={today}
          required
          disabled={pending}
        />
        <SelectField
          name="method"
          label="How it arrived"
          defaultValue="mobile_money"
          disabled={pending}
        >
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
          disabled={pending}
        />
      </div>

      {mixed && (
        <p className={forms.error} role="alert">
          Those fees are in {currencies.join(' and ')}. Pick fees in one currency.
        </p>
      )}

      <div className={forms.actions}>
        <button
          type="submit"
          className={forms.button}
          disabled={pending || picked.length === 0 || mixed}
        >
          {pending ? 'Recording…' : 'Record it and issue a receipt'}
        </button>
        <p className={forms.payoff}>
          {picked.length === 0
            ? 'Tick what the money is for.'
            : 'Makes an invoice for these fees, marked paid, and a receipt you can send.'}
        </p>
      </div>

      {state.status === 'error' && (
        <p className={forms.error} role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}

/** What was just recorded, with the receipt ready to send. */
function Recorded({ state, onAnother }: { state: EarlyPaymentState; onAnother: () => void }) {
  const [sent, send, sending] = useActionState(emailReceipt, { status: 'idle' } as BillingState);
  const receipt = state.receipt!;
  return (
    <div className={forms.form}>
      <p className={styles.fixedValue} role="status">
        {state.message}
      </p>
      <div className={forms.actions}>
        <form action={send}>
          <input type="hidden" name="receiptId" value={receipt.id} />
          <button type="submit" className={forms.button} disabled={sending}>
            {sending ? 'Sending…' : 'Email the receipt'}
          </button>
        </form>
        <Link href={`/receipts/${receipt.number}`} className={`${forms.button} ${forms.quiet}`}>
          View or print it
        </Link>
        <button type="button" className={forms.link} onClick={onAnother}>
          Record another payment
        </button>
      </div>
      {sent.message && (
        <p className={sent.status === 'error' ? forms.error : forms.hint} role="status">
          {sent.message}
        </p>
      )}
    </div>
  );
}
