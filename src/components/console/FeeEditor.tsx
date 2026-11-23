'use client';

import { useActionState, useState } from 'react';
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
};

const IDLE: FeeState = { status: 'idle' };

/** What a person types for a price; an unpriced fee is an empty box. */
function toInput(minor: number, currency: string): string {
  return minor === 0 ? '' : moneyInput(minor, currency);
}

/**
 * The project's fees: see them, add one on a single form, price one where it
 * stands, change or remove any of them at any time. What is set here is exactly what the contract's fee
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
                {!readOnly && fee.amountMinor === 0 && fee.billingKind !== 'usage' && (!isRecurring(fee.billingKind) || fee.nextDueAt) ? (
                  <PriceHere fee={fee} currency={currency} />
                ) : (
                  <span
                    className={`${styles.amount} ${fee.amountMinor === 0 && fee.billingKind !== 'usage' ? styles.unpriced : ''}`}
                  >
                    {fee.amountMinor === 0
                      ? fee.billingKind === 'usage'
                        ? 'Billed as used'
                        : 'No price yet'
                      : `${fee.quantity > 1 ? `${fee.quantity} × ` : ''}${formatMoney(fee.amountMinor, currency)}${BILLING[fee.billingKind].per}`}
                  </span>
                )}
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

/**
 * A price for a fee that has none, typed in its own row. A plan brings its
 * fees unpriced, and opening each one to set a single number was most of the
 * work of pricing a project.
 */
function PriceHere({ fee, currency }: { fee: FeeRow; currency: string }) {
  const [state, action, pending] = useActionState(updateFee, IDLE);
  const [amount, setAmount] = useState('');
  return (
    <form action={action} className={styles.priceHere}>
      <input type="hidden" name="lineItemId" value={fee.id} />
      <input type="hidden" name="label" value={fee.label} />
      <input type="hidden" name="description" value={fee.description ?? ''} />
      <input type="hidden" name="billingKind" value={fee.billingKind} />
      <input type="hidden" name="quantity" value={fee.quantity} />
      <input type="hidden" name="terms" value={fee.terms ?? ''} />
      <input type="hidden" name="nextDueAt" value={isRecurring(fee.billingKind) ? fee.nextDueAt : ''} />
      <input type="hidden" name="status" value={fee.status} />
      <span className={forms.affixWrap}>
        <input
          name="amount"
          className={`${forms.control} ${forms.number}`}
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="Price"
          aria-label={`Price for ${fee.label}, in ${currency}${BILLING[fee.billingKind].per}`}
          aria-invalid={state.status === 'error' || undefined}
          disabled={pending}
        />
        <span className={forms.affix} aria-hidden="true">
          {currency}
        </span>
      </span>
      <button type="submit" className={`${forms.button} ${forms.quiet}`} disabled={pending || amount.trim() === ''}>
        {pending ? 'Saving…' : 'Set'}
      </button>
      {state.status === 'error' && (
        <p className={forms.error} role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}

/** Adding or changing one fee, on one form. What is rarely needed is under More. */
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
  const [label, setLabel] = useState(fee?.label ?? '');
  const [description, setDescription] = useState(fee?.description ?? '');
  const [billingKind, setBillingKind] = useState<BillingKind>(fee?.billingKind ?? 'one_off');
  const [amount, setAmount] = useState(fee ? toInput(fee.amountMinor, currency) : '');
  const [quantity, setQuantity] = useState(String(fee?.quantity ?? 1));
  const [terms, setTerms] = useState(fee?.terms ?? '');
  const [nextDueAt, setNextDueAt] = useState(fee?.nextDueAt ?? '');
  const [status, setStatus] = useState<string>(fee?.status ?? 'planned');
  // Open already when there is something in it to see.
  const [more, setMore] = useState(
    Boolean(fee && (fee.description || fee.terms || fee.quantity > 1 || (fee.status !== 'planned' && fee.status !== 'active'))),
  );
  const [state, action, pending] = useActionState(
    async (previous: FeeState, formData: FormData) => {
      const result = await (fee ? updateFee : addFee)(previous, formData);
      if (result.status === 'done') onDone();
      // A problem with a field under More opens it.
      if (result.status === 'error' && result.field === 'quantity') setMore(true);
      return result;
    },
    IDLE,
  );
  const wrong = (field: NonNullable<FeeState['field']>) =>
    (state.status === 'error' && state.field === field) || undefined;

  return (
    <form action={action} className={styles.form}>
      <input type="hidden" name={fee ? 'lineItemId' : 'projectId'} value={fee ? fee.id : projectId} />
      {/* Kept in state, so what is under More posts whether or not it is open. */}
      <input type="hidden" name="billingKind" value={billingKind} />
      <input type="hidden" name="description" value={description} />
      <input type="hidden" name="quantity" value={quantity} />
      <input type="hidden" name="terms" value={terms} />
      <input type="hidden" name="nextDueAt" value={isRecurring(billingKind) ? nextDueAt : ''} />
      <input type="hidden" name="status" value={status} />

      <p className={styles.formTitle}>{fee ? `Edit ${fee.label}` : 'Add a fee'}</p>

      <div className={forms.grid}>
        <div className={`${forms.field} ${forms.wide}`}>
          <label className={forms.label} htmlFor="fee-label">
            Name
          </label>
          <input
            id="fee-label"
            name="label"
            className={forms.control}
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            maxLength={160}
            placeholder="Website design and build"
            aria-invalid={wrong('label')}
            required
            autoFocus
          />
        </div>
        <div className={forms.field}>
          <span className={forms.label} id="fee-billing-label">
            How it is billed
          </span>
          <Select
            aria-labelledby="fee-billing-label"
            value={billingKind}
            onValueChange={(value) => setBillingKind(value as BillingKind)}
            options={BILLING_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
          />
          <p className={forms.hint}>{BILLING[billingKind].description}</p>
        </div>
        <div className={forms.field}>
          <label className={forms.label} htmlFor="fee-amount">
            Price{BILLING[billingKind].per ? ` (${BILLING[billingKind].per.trim()})` : ''}
          </label>
          <span className={forms.affixWrap}>
            <input
              id="fee-amount"
              name="amount"
              className={`${forms.control} ${forms.number}`}
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
              aria-invalid={wrong('amount')}
            />
            <span className={forms.affix} aria-hidden="true">
              {currency}
            </span>
          </span>
          <p className={forms.hint}>
            {billingKind === 'usage'
              ? 'Leave it empty to enter the amount each time you invoice.'
              : 'Leave it empty to price it later.'}
          </p>
        </div>
        {isRecurring(billingKind) && (
          <div className={forms.field}>
            <span className={forms.label} id="fee-due-label">
              {fee ? 'Next payment due' : 'First payment due'}
            </span>
            <DatePicker aria-labelledby="fee-due-label" value={nextDueAt} onChange={setNextDueAt} invalid={wrong('nextDueAt')} />
          </div>
        )}
      </div>

      {!more ? (
        <button type="button" className={styles.more} onClick={() => setMore(true)} aria-expanded="false">
          More: quantity, payment terms, a description, or a fee not charged yet
        </button>
      ) : (
        <div className={forms.grid}>
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
              aria-invalid={wrong('quantity')}
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
          <div className={`${forms.field} ${forms.wide}`}>
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

      {state.status === 'error' && (
        <p className={forms.error} role="alert">
          {state.message}
          {state.signedOut && (
            <>
              {' '}
              <a href="/sign-in" target="_blank" rel="noopener" className={forms.link}>
                Sign in
              </a>
            </>
          )}
        </p>
      )}

      <div className={styles.formActions}>
        <button type="submit" className={forms.button} disabled={pending}>
          {pending ? 'Saving…' : fee ? 'Save fee' : 'Add fee'}
        </button>
        <button type="button" className={styles.cancel} onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  );
}
