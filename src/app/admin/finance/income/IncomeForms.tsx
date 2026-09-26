'use client';

import React, { useActionState, useState } from 'react';
import { CURRENCIES, currencyLabel } from '@/lib/console/currencies';
import { DateField, TextField } from '@/components/console/Fields';
import { Select } from '@/components/console/Select';
import {
  MenuDivider,
  MenuItem,
  MenuList,
  MenuNote,
  MenuTitle,
  RowMenu,
  useLastSaid,
} from '@/components/console/RowMenu';
import { removeIncome, saveIncome, type FinanceState } from '../actions';
import forms from '@/styles/forms.module.css';

const INITIAL: FinanceState = { status: 'idle' };

type Values = {
  source?: string;
  description?: string | null;
  amount?: string;
  currency?: string;
  productId?: string | null;
  receivedOn?: string;
};

function Message({ state }: { state: FinanceState }) {
  if (!state.message) return null;
  return (
    <p className={state.status === 'error' ? forms.error : forms.hint} role="status" aria-live="polite">
      {state.message}
    </p>
  );
}

/** Where it came from, how much, which product it belongs to, and when. */
function IncomeFields({
  products,
  sources,
  values = {},
  prefix,
  invalid,
}: {
  products: { id: string; name: string }[];
  /** Everything added before, to pick from rather than retype. */
  sources: string[];
  values?: Values;
  prefix: string;
  invalid?: string;
}) {
  return (
    <div className={forms.grid}>
      <div className={forms.field}>
        <label className={forms.label} htmlFor={`${prefix}-source`}>
          Where it came from
        </label>
        <input
          id={`${prefix}-source`}
          name="source"
          className={forms.control}
          list={`${prefix}-sources`}
          defaultValue={values.source ?? ''}
          maxLength={120}
          placeholder="Sifa subscriptions"
          required
          aria-invalid={invalid === 'source' || undefined}
        />
        <datalist id={`${prefix}-sources`}>
          {sources.map((source) => (
            <option key={source} value={source} />
          ))}
        </datalist>
      </div>

      <div className={forms.field}>
        <label className={forms.label} htmlFor={`${prefix}-product`}>
          For one of our products <span className={forms.optional}>(optional)</span>
        </label>
        <Select
          id={`${prefix}-product`}
          name="productId"
          defaultValue={values.productId ?? ''}
          options={[
            { value: '', label: 'None' },
            ...products.map((product) => ({ value: product.id, label: product.name })),
          ]}
          invalid={invalid === 'productId'}
        />
      </div>

      <div className={forms.field}>
        <label className={forms.label} htmlFor={`${prefix}-amount`}>
          Amount that came in
        </label>
        <input
          id={`${prefix}-amount`}
          name="amount"
          className={forms.control}
          inputMode="decimal"
          defaultValue={values.amount ?? ''}
          placeholder="150000"
          required
          aria-invalid={invalid === 'amount' || undefined}
        />
      </div>

      <div className={forms.field}>
        <label className={forms.label} htmlFor={`${prefix}-currency`}>
          Currency
        </label>
        <Select
          id={`${prefix}-currency`}
          name="currency"
          defaultValue={values.currency ?? 'TZS'}
          options={CURRENCIES.map((code) => ({ value: code, label: currencyLabel(code) }))}
        />
      </div>

      <DateField
        name="receivedOn"
        label="Day it came in"
        defaultValue={values.receivedOn}
        invalid={invalid === 'receivedOn'}
      />

      <TextField
        name="description"
        label="Note"
        optional
        maxLength={500}
        defaultValue={values.description ?? ''}
        placeholder="September, through mobile money"
      />
    </div>
  );
}

/** Adding money that came in without an invoice here. */
export function AddIncome({
  products,
  sources,
  today,
}: {
  products: { id: string; name: string }[];
  sources: string[];
  today: string;
}) {
  const [state, action, pending] = useActionState(saveIncome, INITIAL);
  // A fresh form after each entry, so the next one starts clean.
  const [round, setRound] = useState(0);
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state.status === 'done') setRound(round + 1);
  }

  return (
    <form key={round} action={action} className={forms.form}>
      <IncomeFields
        products={products}
        sources={sources}
        values={{ receivedOn: today }}
        prefix={`add-${round}`}
        invalid={state.field}
      />
      <div className={forms.actions}>
        <button type="submit" className={forms.button} disabled={pending}>
          {pending ? 'Adding…' : 'Add the income'}
        </button>
      </div>
      <Message state={state} />
    </form>
  );
}

/** An entry's own choices: change it, or take it out. */
export function IncomeMenu({
  entry,
  products,
  sources,
}: {
  entry: Required<Omit<Values, 'description' | 'productId'>> & {
    id: string;
    description: string | null;
    productId: string | null;
  };
  products: { id: string; name: string }[];
  sources: string[];
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'menu' | 'edit' | 'remove'>('menu');
  const [saveState, save, saving] = useActionState(
    async (previous: FinanceState, formData: FormData) => {
      const result = await saveIncome(previous, formData);
      if (result.status === 'done') setView('menu');
      return result;
    },
    INITIAL,
  );
  const [removeState, remove, removing] = useActionState(removeIncome, INITIAL);
  const said = useLastSaid(saveState, removeState);

  return (
    <RowMenu
      label={`Actions for ${entry.source} on ${entry.receivedOn}`}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setView('menu');
      }}
      wide={view === 'edit'}
    >
      {view === 'edit' && (
        <form action={save} className={forms.form}>
          <input type="hidden" name="incomeId" value={entry.id} />
          <IncomeFields
            products={products}
            sources={sources}
            values={entry}
            prefix={`edit-${entry.id}`}
            invalid={saveState.field}
          />
          <div className={forms.actions}>
            <button type="submit" className={forms.button} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className={`${forms.button} ${forms.quiet}`} onClick={() => setView('menu')}>
              Cancel
            </button>
          </div>
          <Message state={saveState} />
        </form>
      )}
      {view === 'remove' && (
        <form action={remove}>
          <input type="hidden" name="incomeId" value={entry.id} />
          <MenuTitle>Remove this income from {entry.source}?</MenuTitle>
          <div className={forms.actions}>
            <button type="submit" className={`${forms.button} ${forms.danger}`} disabled={removing}>
              {removing ? 'Removing…' : 'Remove'}
            </button>
            <button type="button" className={`${forms.button} ${forms.quiet}`} onClick={() => setView('menu')}>
              Keep
            </button>
          </div>
        </form>
      )}
      {view === 'menu' && (
        <>
          <MenuList>
            <MenuItem onClick={() => setView('edit')}>Change</MenuItem>
            <MenuDivider />
            <MenuItem danger onClick={() => setView('remove')}>
              Remove
            </MenuItem>
          </MenuList>
          {said?.message && (
            <MenuNote tone={said.status === 'error' ? 'bad' : 'quiet'}>{said.message}</MenuNote>
          )}
        </>
      )}
    </RowMenu>
  );
}
