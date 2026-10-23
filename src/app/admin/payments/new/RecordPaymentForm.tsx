'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { recordPaymentFor, type RecordPaymentState } from '../../invoices/actions';
import { formatMoney, moneyInput, parseMoney } from '@/lib/console/money';
import { PAYMENT_METHODS } from '@/lib/console/billing-labels';
import { CheckField, DateField, SelectField, TextField } from '@/components/console/Fields';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';
import styles from './RecordPayment.module.css';

export type ClientChoice = {
  id: string;
  name: string;
  slug: string;
  contact: { name: string; emailable: boolean } | null;
  projects: { id: string; name: string; currency: string }[];
};

export type InvoiceChoice = {
  id: string;
  number: string;
  clientId: string;
  projectId: string | null;
  projectName: string | null;
  currency: string;
  outstandingMinor: number;
  outstanding: string;
  draft: boolean;
};

export type FeeChoice = {
  key: string;
  projectId: string;
  label: string;
  period: string | null;
  amountMinor: number;
  amount: string;
  currency: string;
};

const INITIAL: RecordPaymentState = { status: 'idle' };

export function RecordPaymentForm({
  clients,
  invoices,
  fees,
  mayAddFee,
  vatBps,
  today,
  defaultMethod,
  initialClientId,
  initialTarget,
}: {
  clients: ClientChoice[];
  invoices: InvoiceChoice[];
  fees: FeeChoice[];
  mayAddFee: boolean;
  /** VAT added on top, in basis points; 0 when none is charged. */
  vatBps: number;
  today: string;
  defaultMethod: string;
  initialClientId?: string;
  initialTarget?: string;
}) {
  const [state, action, pending] = useActionState(recordPaymentFor, INITIAL);
  // Every field is held in state: React clears a form after its action runs,
  // and a refused payment must keep what was typed.
  const [clientId, setClientId] = useState(initialClientId ?? '');
  const [target, setTarget] = useState(initialTarget ?? '');
  const [chosenFees, setChosenFees] = useState<string[]>(() => {
    if (!initialTarget?.startsWith('fees:')) return [];
    const here = fees.filter((fee) => fee.projectId === initialTarget.slice(5));
    return here.length === 1 ? [here[0]!.key] : [];
  });
  const [feeLabel, setFeeLabel] = useState('Deposit');
  const [typed, setTyped] = useState<string | null>(null);
  const [receivedAt, setReceivedAt] = useState(today);
  const [method, setMethod] = useState(defaultMethod);
  const [reference, setReference] = useState('');
  const [emailIt, setEmailIt] = useState(true);

  const client = clients.find((row) => row.id === clientId);
  const clientInvoices = invoices.filter((invoice) => invoice.clientId === clientId);
  const projects = client?.projects ?? [];
  const projectsWithFees = projects.filter((project) => fees.some((fee) => fee.projectId === project.id));

  const [kind, targetId] = target ? [target.slice(0, target.indexOf(':')), target.slice(target.indexOf(':') + 1)] : ['', ''];
  const invoice = kind === 'invoice' ? clientInvoices.find((row) => row.id === targetId) : undefined;
  const feesHere = kind === 'fees' ? fees.filter((fee) => fee.projectId === targetId) : [];
  const picked = feesHere.filter((fee) => chosenFees.includes(fee.key));
  const newProject = kind === 'new' ? projects.find((project) => project.id === targetId) : undefined;

  // What the money should come to, worked out the way the server does it.
  const currency = invoice?.currency ?? picked[0]?.currency ?? feesHere[0]?.currency ?? newProject?.currency ?? 'TZS';
  const subtotal = picked.reduce((sum, fee) => sum + fee.amountMinor, 0);
  const feesTotal = subtotal + (vatBps > 0 ? Math.round((subtotal * vatBps) / 10_000) : 0);
  const expected = invoice ? invoice.outstandingMinor : kind === 'fees' ? feesTotal : 0;
  const amount = typed ?? (expected > 0 ? moneyInput(expected, currency) : '');
  const amountMinor = parseMoney(amount, currency);

  const choose = (next: string) => {
    setTarget(next);
    setTyped(null);
    if (next.startsWith('fees:')) {
      const here = fees.filter((fee) => fee.projectId === next.slice(5));
      setChosenFees(here.length === 1 ? [here[0]!.key] : []);
    } else {
      setChosenFees([]);
    }
  };

  const ready =
    Boolean(client) &&
    (kind === 'invoice' ? Boolean(invoice) : kind === 'fees' ? picked.length > 0 : kind === 'new' ? Boolean(newProject) && feeLabel.trim().length >= 2 : false) &&
    amountMinor !== null &&
    amountMinor > 0;

  const contact = client?.contact;

  return (
    <form action={action} className={`${forms.card} ${styles.form}`}>
      <input type="hidden" name="for" value={target} />

      <div className={forms.grid}>
        <SelectField
          name="clientId"
          label="Client"
          value={clientId}
          onChange={(next) => {
            setClientId(next);
            choose('');
          }}
          placeholder="Choose a client"
          disabled={pending}
          wide
        >
          {clients.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </SelectField>
      </div>

      {client && (
        <fieldset className={styles.choices} disabled={pending}>
          <legend className={forms.label}>What it pays for</legend>

          {clientInvoices.map((row) => (
            <label key={row.id} className={forms.checkRow}>
              <input
                type="radio"
                name="target"
                className={forms.check}
                checked={target === `invoice:${row.id}`}
                onChange={() => choose(`invoice:${row.id}`)}
              />
              <span className={forms.checkText}>
                <span>
                  {row.number}, {row.outstanding} outstanding
                </span>
                <span className={forms.hint}>
                  {[row.projectName, row.draft ? 'Not sent yet' : null].filter(Boolean).join('. ')}
                </span>
              </span>
            </label>
          ))}

          {projectsWithFees.map((project) => (
            <label key={project.id} className={forms.checkRow}>
              <input
                type="radio"
                name="target"
                className={forms.check}
                checked={target === `fees:${project.id}`}
                onChange={() => choose(`fees:${project.id}`)}
              />
              <span className={forms.checkText}>
                <span>Fees not invoiced yet</span>
                <span className={forms.hint}>{project.name}</span>
              </span>
            </label>
          ))}

          {mayAddFee && projects.length > 0 && (
            <label className={forms.checkRow}>
              <input
                type="radio"
                name="target"
                className={forms.check}
                checked={kind === 'new'}
                onChange={() => choose(`new:${projects[0]!.id}`)}
              />
              <span className={forms.checkText}>
                <span>Something not priced yet, such as a deposit</span>
              </span>
            </label>
          )}

          {projects.length === 0 && clientInvoices.length === 0 && (
            <p className={forms.hint}>
              {client.name} has no project yet.{' '}
              <Link href={`/projects/new?client=${client.slug}`} className={forms.link}>
                Start one
              </Link>
              , then record the payment on it.
            </p>
          )}
        </fieldset>
      )}

      {kind === 'fees' && feesHere.length > 0 && (
        <div className={table.scroll}>
          <table className={`${table.table} ${table.compact} ${styles.fees}`}>
            <thead>
              <tr>
                <th className={table.th} scope="col">
                  <span className={styles.hidden}>Pays for</span>
                </th>
                <th className={table.th} scope="col">
                  Fee
                </th>
                <th className={table.th} scope="col">
                  Period
                </th>
                <th className={`${table.th} ${table.numericHead}`} scope="col">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {feesHere.map((fee) => (
                <tr key={fee.key} className={table.tr}>
                  <td className={table.td}>
                    <input
                      type="checkbox"
                      name="billables"
                      value={fee.key}
                      className={forms.check}
                      checked={chosenFees.includes(fee.key)}
                      onChange={() => {
                        setTyped(null);
                        setChosenFees((current) =>
                          current.includes(fee.key) ? current.filter((key) => key !== fee.key) : [...current, fee.key],
                        );
                      }}
                      aria-label={`It pays for ${fee.label}${fee.period ? `, ${fee.period}` : ''}`}
                      disabled={pending}
                    />
                  </td>
                  <td className={table.td}>{fee.label}</td>
                  <td className={table.td}>{fee.period ?? <span className={table.muted}>None</span>}</td>
                  <td className={`${table.td} ${table.numeric}`}>{fee.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {kind === 'new' && (
        <div className={forms.grid}>
          {projects.length > 1 && (
            <SelectField
              name="projectForFee"
              label="Project"
              value={targetId}
              onChange={(next) => choose(`new:${next}`)}
              disabled={pending}
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </SelectField>
          )}
          <TextField
            name="feeLabel"
            label="What it is for"
            required
            maxLength={120}
            value={feeLabel}
            onChange={(event) => setFeeLabel(event.target.value)}
            disabled={pending}
          />
        </div>
      )}

      {kind && (
        <>
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
                invoice
                  ? `${invoice.outstanding} outstanding.`
                  : kind === 'fees' && picked.length > 0
                    ? `The ticked fees come to ${formatMoney(feesTotal, currency)}.`
                    : undefined
              }
            />
            <DateField
              name="receivedAt"
              label="Received on"
              defaultValue={receivedAt}
              max={today}
              onChange={setReceivedAt}
              disabled={pending}
            />
            <SelectField name="method" label="How it was paid" value={method} onChange={setMethod} disabled={pending}>
              {PAYMENT_METHODS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectField>
            <TextField
              name="reference"
              label="Reference"
              optional
              maxLength={120}
              hint="From the M-Pesa or bank message."
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              disabled={pending}
            />
          </div>

          {contact?.emailable ? (
            <CheckField
              name="emailReceipt"
              label={`Email the receipt to ${contact.name}`}
              checked={emailIt}
              onChange={(event) => setEmailIt(event.target.checked)}
              disabled={pending}
            />
          ) : (
            <p className={forms.hint}>
              {contact
                ? `${contact.name} cannot be emailed yet. You can print the receipt or save it as a PDF.`
                : `${client?.name} has no main contact to email. You can print the receipt or save it as a PDF.`}
            </p>
          )}
        </>
      )}

      {state.status === 'error' && (
        <p className={forms.error} role="alert">
          {state.message}
        </p>
      )}

      <div className={forms.actions}>
        <button type="submit" className={forms.button} disabled={pending || !ready}>
          {pending ? 'Recording…' : 'Record payment'}
        </button>
      </div>
    </form>
  );
}
