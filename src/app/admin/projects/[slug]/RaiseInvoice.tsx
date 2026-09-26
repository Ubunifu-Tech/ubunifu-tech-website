'use client';

import React, { useActionState, useState } from 'react';
import { createInvoice, type BillingState } from '../../invoices/actions';
import { formatMoney } from '@/lib/console/money';
import { DateField } from '@/components/console/Fields';
import styles from '../../Admin.module.css';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';

const INITIAL: BillingState = { status: 'idle' };

export type BillableLine = {
  key: string;
  label: string;
  terms: string | null;
  amount: string;
  amountMinor: number;
  currency: string;
  /** Set when this is one period of a recurring line. */
  period: string | null;
  due: string | null;
};

/**
 * Raising an invoice from what is still owed on the project.
 *
 * Only shows what is genuinely billable: a line already invoiced in full is
 * absent, and a renewal that is not due for months is absent too, because an
 * invoice for money that is not yet owed is the fastest way to lose a client's
 * trust in the bill.
 */
export function RaiseInvoice({
  projectId,
  lines,
  defaultDue,
}: {
  projectId: string;
  lines: BillableLine[];
  defaultDue: string;
}) {
  const [state, action, pending] = useActionState(createInvoice, INITIAL);
  const [chosen, setChosen] = useState<string[]>(() => lines.map((line) => line.key));

  if (lines.length === 0) {
    return (
      <p className={styles.note}>
        Nothing to invoice. Every fee line is either billed in full, unpriced, or a renewal whose
        next period is not close enough yet.
      </p>
    );
  }

  const toggle = (id: string) =>
    setChosen((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );

  const picked = lines.filter((line) => chosen.includes(line.key));
  const currencies = [...new Set(picked.map((line) => line.currency))];
  const total = picked.reduce((sum, line) => sum + line.amountMinor, 0);
  const mixed = currencies.length > 1;

  return (
    <form action={action} className={forms.form}>
      <input type="hidden" name="projectId" value={projectId} />

      <div className={table.scroll}>
        <table className={`${table.table} ${table.compact}`}>
          <thead>
            <tr>
              <th className={table.th} scope="col">Bill</th>
              <th className={table.th} scope="col">Item</th>
              <th className={table.th} scope="col">Period or terms</th>
              <th className={table.th} scope="col">Due</th>
              <th className={`${table.th} ${table.numericHead}`} scope="col">Amount</th>
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
                    aria-label={`Include ${line.label}${line.period ? `, ${line.period}` : ''}`}
                    disabled={pending}
                  />
                </td>
                <td className={`${table.td} ${table.primary}`}>{line.label}</td>
                <td className={table.td}>
                  {line.period ?? line.terms ?? <span className={table.muted}>None</span>}
                </td>
                <td className={`${table.td} ${table.nowrap}`}>
                  {line.due ?? <span className={table.muted}>On agreement</span>}
                </td>
                <td className={`${table.td} ${table.numeric}`}>{line.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={forms.grid}>
        <DateField
          name="dueAt"
          label="Due by"
          defaultValue={defaultDue}
          disabled={pending}
          hint="Fourteen days is the default. Change it if you agreed otherwise."
        />

        <div className={forms.field}>
          <label className={forms.label} htmlFor="invoice-notes">
            Note on the invoice <span className={forms.optional}>(optional)</span>
          </label>
          <input
            id="invoice-notes"
            name="notes"
            className={forms.control}
            maxLength={500}
            placeholder="Payment details, or what this covers"
            disabled={pending}
          />
        </div>
      </div>

      {mixed && (
        <p className={forms.error} role="alert">
          Those lines are in {currencies.join(' and ')}. An invoice has one currency, so untick one
          set and raise a second invoice for the other.
        </p>
      )}

      <div className={forms.actions}>
        <button
          type="submit"
          className={forms.button}
          disabled={pending || picked.length === 0 || mixed}
        >
          {pending ? 'Raising…' : 'Raise the invoice'}
        </button>
        <p className={forms.payoff}>
          {picked.length === 0
            ? 'Pick at least one line.'
            : `${picked.length} line${picked.length === 1 ? '' : 's'}, ${formatMoney(total, currencies[0] ?? 'USD')}. Raised as a draft. Nothing is sent until you send it.`}
        </p>
      </div>

      {state.message && (
        <p className={forms.error} role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
