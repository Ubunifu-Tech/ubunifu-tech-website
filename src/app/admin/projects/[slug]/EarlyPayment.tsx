'use client';

import React, { useActionState, useState } from 'react';
import Link from 'next/link';
import {
  emailReceipt,
  recordEarlyPayment,
  type BillingState,
  type EarlyPaymentState,
} from '../../invoices/actions';
import { formatMoney, moneyInput, parseMoney } from '@/lib/console/money';
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
  vatBps,
  reason,
}: {
  projectId: string;
  lines: BillableLine[];
  today: string;
  /** The VAT added on top, in basis points; 0 when none is charged. */
  vatBps: number;
  /** Why nothing can take a payment, when that is the case. */
  reason: string;
}) {
  const [state, action, pending] = useActionState(recordEarlyPayment, INITIAL);
  const [chosen, setChosen] = useState<string[]>([]);
  // The amount follows the fees picked until someone types their own.
  const [typed, setTyped] = useState<string | null>(null);
  // Kept in state so a refused submission does not wipe them: React resets a
  // form after its action runs, error or not.
  const [method, setMethod] = useState('mobile_money');
  const [reference, setReference] = useState('');
  const [done, setDone] = useState<EarlyPaymentState | null>(null);
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state.status === 'done') {
      setDone(state);
      setChosen([]);
      setTyped(null);
      setReference('');
    }
  }

  if (done?.receipt) {
    return <Recorded state={done} onAnother={() => setDone(null)} />;
  }

  if (lines.length === 0) return <p className={styles.note}>{reason}</p>;

  const picked = lines.filter((line) => chosen.includes(line.key));
  const currencies = [...new Set(picked.map((line) => line.currency))];
  const currency = currencies[0] ?? lines[0]!.currency;
  const mixed = currencies.length > 1;
  // The same sum and rounding the server uses, so the figure here is the
  // invoice's total and a full payment is recorded as one.
  const subtotal = mixed ? 0 : picked.reduce((sum, line) => sum + line.amountMinor, 0);
  const vat = vatBps > 0 ? Math.round((subtotal * vatBps) / 10_000) : 0;
  const total = subtotal + vat;
  const amount = typed ?? (total > 0 ? moneyInput(total, currency) : '');
  const typedMinor = parseMoney(amount, currency);
  const partial = total > 0 && typedMinor !== null && typedMinor > 0 && typedMinor < total;

  const toggle = (key: string) => {
    const next = chosen.includes(key) ? chosen.filter((value) => value !== key) : [...chosen, key];
    // A typed amount belongs to the fees it was typed for.
    const nextCurrencies = new Set(
      lines.filter((l) => next.includes(l.key)).map((l) => l.currency),
    );
    if (!nextCurrencies.has(currency) || nextCurrencies.size !== 1) setTyped(null);
    setChosen(next);
  };

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
              <th className={table.th} scope="col">
                Period or terms
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
                <td className={`${table.td} ${table.primary}`}>{line.label}</td>
                <td className={table.td}>
                  {line.period ?? line.terms ?? <span className={table.muted}>None</span>}
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
              ? `Those fees come to ${formatMoney(total, currency)}${vat > 0 ? `, with ${formatMoney(vat, currency)} VAT` : ''}. Less is fine; the rest stays owed.`
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
          value={method}
          onChange={setMethod}
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
          value={reference}
          onChange={(event) => setReference(event.target.value)}
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
            : partial
              ? 'Makes an invoice for these fees, part paid, and a receipt you can send.'
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
