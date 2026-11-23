'use client';

import { useActionState, useState } from 'react';
import { createInvoice, type BillingState } from './actions';
import { formatMoney, moneyInput, parseMoney } from '@/lib/console/money';
import { DateField } from '@/components/console/Fields';
import styles from '../Admin.module.css';
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
  /** Billed by usage: this time's amount is typed in. */
  usage: boolean;
  /** A one-off fee: part of it can be invoiced now and the rest later. */
  split: boolean;
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
  termsDays,
}: {
  projectId: string;
  lines: BillableLine[];
  defaultDue: string;
  /** The payment terms in Billing details, which the due date starts from. */
  termsDays: number;
}) {
  const [state, action, pending] = useActionState(createInvoice, INITIAL);
  // A usage line with nothing to start from is left unticked until its
  // amount is typed, so it never stops the rest being invoiced.
  const [chosen, setChosen] = useState<string[]>(() =>
    lines.filter((line) => !line.usage || line.amountMinor > 0).map((line) => line.key),
  );
  // The amount for each line that takes one: this time's amount for usage,
  // and what is left of a one-off fee, which can be lowered to invoice a part
  // of it now. Kept in state so a refused submission does not wipe it.
  const [typed, setTyped] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      lines
        .filter((line) => line.usage || line.split)
        .map((line) => [line.key, line.amountMinor > 0 ? moneyInput(line.amountMinor, line.currency) : '']),
    ),
  );

  if (lines.length === 0) {
    return (
      <p className={styles.note}>
        Nothing to invoice right now. Fees are either billed in full or renew later. If a fee has
        no price, or a monthly or yearly fee has no first payment date, add it on the Fees tab.
      </p>
    );
  }

  const toggle = (id: string) =>
    setChosen((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );

  const picked = lines.filter((line) => chosen.includes(line.key));
  const currencies = [...new Set(picked.map((line) => line.currency))];
  const amountOf = (line: BillableLine) =>
    line.usage || line.split
      ? (parseMoney(typed[line.key] ?? '', line.currency) ?? 0)
      : line.amountMinor;
  const total = picked.reduce((sum, line) => sum + amountOf(line), 0);
  const mixed = currencies.length > 1;
  // A part cannot be more than what is left of the fee, or nothing at all.
  const wrong = picked.some(
    (line) => line.split && (amountOf(line) <= 0 || amountOf(line) > line.amountMinor),
  );
  const canSplit = lines.some((line) => line.split);

  return (
    <form action={action} className={forms.form}>
      <input type="hidden" name="projectId" value={projectId} />

      <div className={table.scroll}>
        <table className={`${table.table} ${table.compact}`}>
          <thead>
            <tr>
              <th className={table.th} scope="col">Bill</th>
              <th className={table.th} scope="col">Item</th>
              <th className={`${table.th} ${table.deskOnly}`} scope="col">Period or terms</th>
              <th className={`${table.th} ${table.deskOnly}`} scope="col">Due</th>
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
                <td className={`${table.td} ${table.primary}`}>
                  {line.label}
                  {line.period && <span className={`${table.sub} ${table.phoneOnly}`}>{line.period}</span>}
                </td>
                <td className={`${table.td} ${table.deskOnly}`}>
                  {line.period ?? line.terms ?? <span className={table.muted}>None</span>}
                </td>
                <td className={`${table.td} ${table.nowrap} ${table.deskOnly}`}>
                  {line.due ?? <span className={table.muted}>On agreement</span>}
                </td>
                <td className={`${table.td} ${table.numeric}`}>
                  {line.usage ? (
                    <input
                      name={`amount:${line.key}`}
                      className={`${forms.control} ${forms.number}`}
                      inputMode="decimal"
                      value={typed[line.key] ?? ''}
                      onChange={(event) => {
                        const value = event.target.value;
                        setTyped((current) => ({ ...current, [line.key]: value }));
                        if (value.trim() && !chosen.includes(line.key)) toggle(line.key);
                      }}
                      placeholder="0.00"
                      aria-label={`This time's amount for ${line.label}, in ${line.currency}`}
                      disabled={pending}
                    />
                  ) : line.split ? (
                    <>
                      <input
                        name={`amount:${line.key}`}
                        className={`${forms.control} ${forms.number}`}
                        inputMode="decimal"
                        value={typed[line.key] ?? ''}
                        onChange={(event) => {
                          const value = event.target.value;
                          setTyped((current) => ({ ...current, [line.key]: value }));
                        }}
                        aria-label={`Amount to invoice now for ${line.label}, in ${line.currency}. ${line.amount} is left.`}
                        disabled={pending || !chosen.includes(line.key)}
                      />
                      {chosen.includes(line.key) && amountOf(line) > line.amountMinor ? (
                        <span className={`${table.sub} ${forms.error}`}>Only {line.amount} is left</span>
                      ) : chosen.includes(line.key) && amountOf(line) > 0 && amountOf(line) < line.amountMinor ? (
                        <span className={table.sub}>
                          {formatMoney(line.amountMinor - amountOf(line), line.currency)} stays for a later invoice
                        </span>
                      ) : (
                        <span className={table.sub}>of {line.amount} left</span>
                      )}
                    </>
                  ) : (
                    line.amount
                  )}
                </td>
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
          hint={`Your usual ${termsDays} days. Change it if you agreed otherwise.`}
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

      {canSplit && (
        <p className={styles.note}>
          To invoice a first part now and the rest later, lower the amount. What you leave stays
          ready to invoice.
        </p>
      )}

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
          disabled={pending || picked.length === 0 || mixed || wrong}
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
