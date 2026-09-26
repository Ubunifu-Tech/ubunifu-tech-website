'use client';

import React, { useActionState, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { BillingKind, LineItemStatus } from '@/generated/prisma/client';
import {
  addFee,
  removeFee,
  updateFee,
  type FeeState,
} from '@/app/admin/projects/[slug]/fee-actions';
import { BILLING, BILLING_OPTIONS, FEE_STATUS_LABEL, isRecurring } from '@/lib/console/fee-labels';
import { formatMoney, formatShortDate, moneyInput } from '@/lib/console/money';
import { Steps } from './Steps';
import { ChoiceCards } from './ChoiceCards';
import { DatePicker } from './DatePicker';
import { Select } from './Select';
import forms from '@/styles/forms.module.css';
import styles from './FeeEditor.module.css';

export type FeeRow = {
  id: string;
  label: string;
  description: string | null;
  billingKind: BillingKind;
  amountMinor: number;
  quantity: number;
  terms: string | null;
  nextDueAt: string;
  status: LineItemStatus;
  invoiced: boolean;
};

const IDLE: FeeState = { status: 'idle' };

const STEPS = [
  { key: 'what', label: 'What it is' },
  { key: 'billing', label: 'How it is billed' },
  { key: 'price', label: 'Price' },
];

/** What a person types for a price; an unpriced fee is an empty box. */
function toInput(minor: number, currency: string): string {
  return minor === 0 ? '' : moneyInput(minor, currency);
}

const FIELD_STEP: Record<NonNullable<FeeState['field']>, number> = {
  label: 0,
  billingKind: 1,
  amount: 2,
  quantity: 2,
  nextDueAt: 2,
};

/**
 * The project's fees: see them, add one step by step, change or remove any
 * of them at any time. What is set here is exactly what the contract's fee
 * schedule will say, because the schedule is generated from these.
 */
export function FeeEditor({
  projectId,
  currency,
  fees,
  readOnly = false,
}: {
  projectId: string;
  currency: string;
  fees: FeeRow[];
  /** For a role that can see fees but not change them. */
  readOnly?: boolean;
}) {
  const [editing, setEditing] = useState<FeeRow | 'new' | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [removeState, removeAction, removePending] = useActionState(removeFee, IDLE);

  const counted = fees.filter((fee) => fee.status === 'planned' || fee.status === 'active');
  const sum = (kinds: BillingKind[]) =>
    counted
      .filter((fee) => kinds.includes(fee.billingKind))
      .reduce((total, fee) => total + fee.amountMinor * fee.quantity, 0);
  const once = sum(['one_off', 'installment']);
  const monthly = sum(['recurring_monthly']);
  const yearly = sum(['recurring_annual']);

  return (
    <div className={styles.editor}>
      {fees.length === 0 && editing === null ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>No fees yet</p>
          <p className={styles.emptyText}>
            {readOnly ? 'Someone who can set fees will add them.' : 'Add what the client will pay. It goes into the proposal and the agreement.'}
          </p>
        </div>
      ) : (
        <ul className={styles.list}>
          {fees.map((fee) =>
            editing !== 'new' && editing?.id === fee.id ? (
              <li key={fee.id} className={styles.formRow}>
                <FeeForm projectId={projectId} currency={currency} fee={fee} onDone={() => setEditing(null)} />
              </li>
            ) : (
              <li
                key={fee.id}
                className={`${styles.row} ${fee.status === 'planned' || fee.status === 'active' ? '' : styles.rowMuted}`}
              >
                <div className={styles.rowMain}>
                  <span className={styles.name}>{fee.label}</span>
                  <span className={styles.meta}>
                    {BILLING[fee.billingKind].label}
                    {isRecurring(fee.billingKind)
                      ? fee.nextDueAt
                        ? ` · next due ${formatShortDate(new Date(`${fee.nextDueAt}T00:00:00Z`))}`
                        : ' · No first payment date yet'
                      : ''}
                    {fee.terms ? ` · ${fee.terms}` : ''}
                    {fee.status !== 'planned' && fee.status !== 'active' ? ` · ${FEE_STATUS_LABEL[fee.status]}` : ''}
                  </span>
                </div>
                <span className={`${styles.amount} ${fee.amountMinor === 0 ? styles.unpriced : ''}`}>
                  {fee.amountMinor === 0
                    ? 'No price yet'
                    : `${fee.quantity > 1 ? `${fee.quantity} × ` : ''}${formatMoney(fee.amountMinor, currency)}${BILLING[fee.billingKind].per}`}
                </span>
                {readOnly ? null : removing === fee.id ? (
                  <form action={removeAction} className={styles.confirmRemove}>
                    <input type="hidden" name="lineItemId" value={fee.id} />
                    <span>Remove?</span>
                    <button type="submit" className={`${forms.button} ${forms.danger}`} disabled={removePending}>
                      {removePending ? 'Removing…' : 'Remove'}
                    </button>
                    <button type="button" className={`${forms.button} ${forms.quiet}`} onClick={() => setRemoving(null)}>
                      Keep
                    </button>
                  </form>
                ) : (
                  <span className={styles.rowActions}>
                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={() => setEditing(fee)}
                      aria-label={`Edit ${fee.label}`}
                    >
                      <Pencil size={15} strokeWidth={2} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={`${styles.iconButton} ${styles.iconDanger}`}
                      onClick={() => setRemoving(fee.id)}
                      aria-label={`Remove ${fee.label}`}
                    >
                      <Trash2 size={15} strokeWidth={2} aria-hidden="true" />
                    </button>
                  </span>
                )}
              </li>
            ),
          )}
          {editing === 'new' && (
            <li className={styles.formRow}>
              <FeeForm projectId={projectId} currency={currency} onDone={() => setEditing(null)} />
            </li>
          )}
        </ul>
      )}

      {removeState.status === 'error' && (
        <p className={forms.error} role="alert">
          {removeState.message}
        </p>
      )}

      <div className={styles.foot}>
        {editing === null && !readOnly && (
          <button type="button" className={`${forms.button} ${forms.quiet}`} onClick={() => setEditing('new')}>
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
            Add a fee
          </button>
        )}
        {readOnly && fees.length > 0 && (
          <p className={forms.hint}>Someone who can set fees can change these.</p>
        )}
        {counted.length > 0 && (
          <dl className={styles.totals}>
            {once > 0 && (
              <div>
                <dt>One-off</dt>
                <dd>{formatMoney(once, currency)}</dd>
              </div>
            )}
            {monthly > 0 && (
              <div>
                <dt>Monthly</dt>
                <dd>{formatMoney(monthly, currency)}</dd>
              </div>
            )}
            {yearly > 0 && (
              <div>
                <dt>Yearly</dt>
                <dd>{formatMoney(yearly, currency)}</dd>
              </div>
            )}
          </dl>
        )}
      </div>
    </div>
  );
}

/** Adding or changing one fee, a step at a time. */
function FeeForm({
  projectId,
  currency,
  fee,
  onDone,
}: {
  projectId: string;
  currency: string;
  fee?: FeeRow;
  onDone: () => void;
}) {
  const [step, setStep] = useState(0);
  const [state, action, pending] = useActionState(
    async (previous: FeeState, formData: FormData) => {
      const result = await (fee ? updateFee : addFee)(previous, formData);
      if (result.status === 'done') onDone();
      // A problem with one field opens the step that field is on.
      if (result.status === 'error' && result.field) setStep(FIELD_STEP[result.field]);
      return result;
    },
    IDLE,
  );

  const [label, setLabel] = useState(fee?.label ?? '');
  const [description, setDescription] = useState(fee?.description ?? '');
  const [billingKind, setBillingKind] = useState<BillingKind>(fee?.billingKind ?? 'one_off');
  const [amount, setAmount] = useState(fee ? toInput(fee.amountMinor, currency) : '');
  const [quantity, setQuantity] = useState(String(fee?.quantity ?? 1));
  const [terms, setTerms] = useState(fee?.terms ?? '');
  const [nextDueAt, setNextDueAt] = useState(fee?.nextDueAt ?? '');
  const [status, setStatus] = useState<string>(fee?.status ?? 'planned');
  const [problem, setProblem] = useState<string | null>(null);

  const shown = step;

  function next() {
    if (shown === 0 && label.trim().length < 2) {
      setProblem('Give the fee a name.');
      return;
    }
    setProblem(null);
    setStep(shown + 1);
  }

  return (
    <form action={action} className={styles.form}>
      <input type="hidden" name={fee ? 'lineItemId' : 'projectId'} value={fee ? fee.id : projectId} />
      {/* Every field posts, whichever step is on screen. */}
      <input type="hidden" name="label" value={label} />
      <input type="hidden" name="description" value={description} />
      <input type="hidden" name="amount" value={amount} />
      <input type="hidden" name="quantity" value={quantity} />
      <input type="hidden" name="terms" value={terms} />
      <input type="hidden" name="nextDueAt" value={isRecurring(billingKind) ? nextDueAt : ''} />
      <input type="hidden" name="status" value={status} />

      <p className={styles.formTitle}>{fee ? `Edit ${fee.label}` : 'Add a fee'}</p>
      <Steps steps={STEPS} current={shown} onSelect={setStep} reachable={fee ? STEPS.length - 1 : Math.max(shown, label ? 2 : 0)} />

      {shown === 0 && (
        <div className={forms.grid}>
          <div className={`${forms.field} ${forms.wide}`}>
            <label className={forms.label} htmlFor="fee-label">
              Name
            </label>
            <input
              id="fee-label"
              className={forms.control}
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              maxLength={160}
              placeholder="Website design and build"
              autoFocus
            />
          </div>
          <div className={`${forms.field} ${forms.wide}`}>
            <label className={forms.label} htmlFor="fee-description">
              Description <span className={forms.optional}>(optional)</span>
            </label>
            <input
              id="fee-description"
              className={forms.control}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={500}
              placeholder="Six pages, booking form, two languages"
            />
          </div>
        </div>
      )}

      {shown === 1 && (
        <ChoiceCards
          name="billingKind"
          legend="How is it billed?"
          choices={BILLING_OPTIONS}
          value={billingKind}
          onChange={(value) => setBillingKind(value as BillingKind)}
        />
      )}
      {shown !== 1 && <input type="hidden" name="billingKind" value={billingKind} />}

      {shown === 2 && (
        <div className={forms.grid}>
          <div className={forms.field}>
            <label className={forms.label} htmlFor="fee-amount">
              Price{BILLING[billingKind].per ? ` (${BILLING[billingKind].per.trim()})` : ''}
            </label>
            <span className={forms.affixWrap}>
              <input
                id="fee-amount"
                className={`${forms.control} ${forms.number}`}
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                autoFocus
              />
              <span className={forms.affix} aria-hidden="true">
                {currency}
              </span>
            </span>
          </div>
          <div className={forms.field}>
            <label className={forms.label} htmlFor="fee-quantity">
              Quantity
            </label>
            <input
              id="fee-quantity"
              className={`${forms.control} ${forms.number}`}
              inputMode="numeric"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </div>
          {isRecurring(billingKind) && (
            <div className={forms.field}>
              <span className={forms.label} id="fee-due-label">
                First payment due
              </span>
              <DatePicker aria-labelledby="fee-due-label" value={nextDueAt} onChange={setNextDueAt} />
            </div>
          )}
          <div className={`${forms.field} ${isRecurring(billingKind) ? '' : forms.wide}`}>
            <label className={forms.label} htmlFor="fee-terms">
              Payment terms <span className={forms.optional}>(optional)</span>
            </label>
            <input
              id="fee-terms"
              className={forms.control}
              value={terms}
              onChange={(event) => setTerms(event.target.value)}
              maxLength={500}
              placeholder="50% at the start, 50% on handover"
            />
          </div>
          {/* On a new fee too: a line agreed now but charged later (email
              set up next year, a feature paused) is added as such. */}
          <div className={forms.field}>
            <span className={forms.label} id="fee-status-label">
              Status
            </span>
            <Select
              aria-labelledby="fee-status-label"
              value={status}
              onValueChange={setStatus}
              options={(['planned', 'active', 'deferred', 'paused', 'waived'] as const).map((value) => ({
                value,
                label: FEE_STATUS_LABEL[value],
              }))}
            />
          </div>
        </div>
      )}

      {(problem || state.status === 'error') && (
        <p className={forms.error} role="alert">
          {problem ?? state.message}
        </p>
      )}

      <div className={styles.formActions}>
        {shown > 0 && (
          <button type="button" className={`${forms.button} ${forms.quiet}`} onClick={() => setStep(shown - 1)}>
            Back
          </button>
        )}
        {shown < STEPS.length - 1 && (
          <button
            type="button"
            className={fee ? `${forms.button} ${forms.quiet}` : forms.button}
            onClick={next}
          >
            Next
          </button>
        )}
        {/* An edit is usually one change, so it can be saved from any step. */}
        {(fee || shown === STEPS.length - 1) && (
          <button type="submit" className={forms.button} disabled={pending}>
            {pending ? 'Saving…' : fee ? 'Save fee' : 'Add fee'}
          </button>
        )}
        <button type="button" className={styles.cancel} onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  );
}
