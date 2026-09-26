'use client';

import React, { useActionState, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { upload } from '@vercel/blob/client';
import { CURRENCIES, currencyLabel } from '@/lib/console/currencies';
import {
  BILL_CONTENT_TYPES,
  COST_CATEGORIES,
  MAX_BILL_BYTES,
  billFolder,
} from '@/lib/console/cost-labels';
import { CheckField, DateField, TextField } from '@/components/console/Fields';
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
import {
  attachBill,
  removeBill,
  removeCost,
  saveCost,
  saveRegularCost,
  setRegularCostActive,
  type FinanceState,
} from '../actions';
import styles from '../../Admin.module.css';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';

const INITIAL: FinanceState = { status: 'idle' };

export type Choices = {
  clients: { id: string; name: string }[];
  projects: { id: string; name: string; clientId: string }[];
  /** Our own products, for a cost that keeps one running. */
  products: { id: string; name: string }[];
  /** Everyone paid before, to pick from rather than retype. */
  vendors: string[];
};

type Values = {
  vendor?: string;
  category?: string;
  description?: string | null;
  /** As typed: "20.00". */
  amount?: string;
  currency?: string;
  clientId?: string | null;
  projectId?: string | null;
  productId?: string | null;
  incurredOn?: string;
};

function Message({ state }: { state: FinanceState }) {
  if (!state.message) return null;
  return (
    <p className={state.status === 'error' ? forms.error : forms.hint} role="status" aria-live="polite">
      {state.message}
    </p>
  );
}

/**
 * Who it was paid to, what for, how much, and which client or project it
 * served. The project list follows the client, so the two cannot disagree.
 */
function CostFields({
  choices,
  values = {},
  amountName,
  amountLabel,
  withDate,
  prefix,
  invalid,
}: {
  choices: Choices;
  values?: Values;
  amountName: 'amount' | 'usual';
  amountLabel: string;
  withDate: boolean;
  /** Keeps ids apart when several of these are on the page. */
  prefix: string;
  invalid?: string;
}) {
  const [clientId, setClientId] = useState(values.clientId ?? '');
  const [projectId, setProjectId] = useState(values.projectId ?? '');
  const projects = choices.projects.filter((project) => !clientId || project.clientId === clientId);

  return (
    <div className={forms.grid}>
      <div className={forms.field}>
        <label className={forms.label} htmlFor={`${prefix}-vendor`}>
          Paid to
        </label>
        <input
          id={`${prefix}-vendor`}
          name="vendor"
          className={forms.control}
          list={`${prefix}-vendors`}
          defaultValue={values.vendor ?? ''}
          maxLength={120}
          placeholder="Vercel"
          required
          aria-invalid={invalid === 'vendor' || undefined}
        />
        <datalist id={`${prefix}-vendors`}>
          {choices.vendors.map((vendor) => (
            <option key={vendor} value={vendor} />
          ))}
        </datalist>
      </div>

      <div className={forms.field}>
        <label className={forms.label} htmlFor={`${prefix}-category`}>
          Spent on
        </label>
        <Select
          id={`${prefix}-category`}
          name="category"
          defaultValue={values.category ?? 'hosting'}
          options={COST_CATEGORIES}
          invalid={invalid === 'category'}
        />
      </div>

      <div className={forms.field}>
        <label className={forms.label} htmlFor={`${prefix}-amount`}>
          {amountLabel}
        </label>
        <input
          id={`${prefix}-amount`}
          name={amountName}
          className={forms.control}
          inputMode="decimal"
          defaultValue={values.amount ?? ''}
          placeholder="20.00"
          required
          aria-invalid={invalid === amountName || undefined}
        />
      </div>

      <div className={forms.field}>
        <label className={forms.label} htmlFor={`${prefix}-currency`}>
          Currency
        </label>
        <Select
          id={`${prefix}-currency`}
          name="currency"
          defaultValue={values.currency ?? 'USD'}
          options={CURRENCIES.map((code) => ({ value: code, label: currencyLabel(code) }))}
        />
      </div>

      {withDate && (
        <DateField
          name="incurredOn"
          label="Date on the bill"
          defaultValue={values.incurredOn}
          invalid={invalid === 'incurredOn'}
        />
      )}

      <div className={forms.field}>
        <label className={forms.label} htmlFor={`${prefix}-client`}>
          For a client <span className={forms.optional}>(optional)</span>
        </label>
        <Select
          id={`${prefix}-client`}
          name="clientId"
          value={clientId}
          onValueChange={(next) => {
            setClientId(next);
            if (next && !choices.projects.some((p) => p.id === projectId && p.clientId === next)) {
              setProjectId('');
            }
          }}
          options={[
            { value: '', label: 'The business as a whole' },
            ...choices.clients.map((client) => ({ value: client.id, label: client.name })),
          ]}
        />
      </div>

      <div className={forms.field}>
        <label className={forms.label} htmlFor={`${prefix}-project`}>
          For a project <span className={forms.optional}>(optional)</span>
        </label>
        <Select
          id={`${prefix}-project`}
          name="projectId"
          value={projectId}
          onValueChange={(next) => {
            setProjectId(next);
            const project = choices.projects.find((p) => p.id === next);
            if (project) setClientId(project.clientId);
          }}
          options={[
            { value: '', label: 'No one project' },
            ...projects.map((project) => ({ value: project.id, label: project.name })),
          ]}
          invalid={invalid === 'projectId'}
        />
      </div>

      {choices.products.length > 0 && (
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
              ...choices.products.map((product) => ({ value: product.id, label: product.name })),
            ]}
            invalid={invalid === 'productId'}
          />
        </div>
      )}

      <TextField
        name="description"
        label="Note"
        optional
        wide
        maxLength={500}
        defaultValue={values.description ?? ''}
        placeholder="Pro plan and September usage"
      />
    </div>
  );
}

/** Adding a bill, with the choice to expect it again every month. */
export function AddCost({
  choices,
  today,
  canAttach,
}: {
  choices: Choices;
  today: string;
  /** Whether bills can be stored on this deployment. */
  canAttach: boolean;
}) {
  const [state, action, pending] = useActionState(saveCost, INITIAL);
  // A fresh form after each cost, so the next one starts clean.
  const [round, setRound] = useState(0);
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state.status === 'done') setRound(round + 1);
  }

  return (
    <form key={round} action={action} className={forms.form}>
      <CostFields
        choices={choices}
        values={{ incurredOn: today }}
        amountName="amount"
        amountLabel="Amount on the bill"
        withDate
        prefix={`add-${round}`}
        invalid={state.field}
      />
      <CheckField
        name="everyMonth"
        label="It comes every month"
        hint="It will wait here each month for you to add that month's amount."
      />
      <div className={forms.actions}>
        <button type="submit" className={forms.button} disabled={pending}>
          {pending ? 'Adding…' : 'Add the cost'}
        </button>
        {state.status === 'done' && state.costId && canAttach && (
          <AttachBill costId={state.costId} label="Attach its bill" />
        )}
      </div>
      <Message state={state} />
    </form>
  );
}

/**
 * Sends a bill, a PDF or a photo of the paper one, straight to the store and
 * files it with the cost. Checked here first only so a wrong file is caught
 * before it uploads; the server checks everything again.
 */
export function AttachBill({ costId, label = 'Attach' }: { costId: string; label?: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<
    { kind: 'idle' } | { kind: 'sending'; percent: number } | { kind: 'error'; message: string }
  >({ kind: 'idle' });

  async function send(file: File) {
    if (!BILL_CONTENT_TYPES.includes(file.type)) {
      setStage({ kind: 'error', message: 'Attach the bill as a PDF or a photo.' });
      return;
    }
    if (file.size > MAX_BILL_BYTES) {
      setStage({ kind: 'error', message: 'That file is larger than 10 MB.' });
      return;
    }
    setStage({ kind: 'sending', percent: 0 });
    try {
      const blob = await upload(`${billFolder(costId)}/${file.name.replace(/[\\/]/g, '-')}`, file, {
        access: 'private',
        // Rewritten by the console host to /admin/finance/costs/upload.
        handleUploadUrl: '/finance/costs/upload',
        clientPayload: costId,
        onUploadProgress: ({ percentage }) => setStage({ kind: 'sending', percent: Math.round(percentage) }),
      });
      const result = await attachBill(costId, blob.url, file.name);
      if (result.status === 'error') {
        setStage({ kind: 'error', message: result.message ?? 'That did not arrive. Try it again?' });
        return;
      }
      setStage({ kind: 'idle' });
      router.refresh();
    } catch (error) {
      console.error('[costs] bill upload failed', error);
      setStage({ kind: 'error', message: 'That did not go through. Try it again?' });
    }
  }

  return (
    <span className={styles.inlineForm}>
      <input
        ref={input}
        type="file"
        accept={BILL_CONTENT_TYPES.join(',')}
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void send(file);
        }}
      />
      <button
        type="button"
        className={table.action}
        onClick={() => input.current?.click()}
        disabled={stage.kind === 'sending'}
      >
        {stage.kind === 'sending' ? `Sending ${stage.percent}%` : label}
      </button>
      {stage.kind === 'error' && (
        <span className={forms.error} role="alert">
          {stage.message}
        </span>
      )}
    </span>
  );
}

/** A cost's own choices: change it, or take it out. */
export function CostMenu({
  cost,
  choices,
  hasBill,
}: {
  cost: { id: string; vendor: string } & Required<Omit<Values, 'description'>> & {
      description: string | null;
    };
  choices: Choices;
  hasBill: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'menu' | 'edit' | 'remove'>('menu');
  const [saveState, save, saving] = useActionState(
    async (previous: FinanceState, formData: FormData) => {
      const result = await saveCost(previous, formData);
      if (result.status === 'done') setView('menu');
      return result;
    },
    INITIAL,
  );
  const [removeState, remove, removing] = useActionState(removeCost, INITIAL);
  const [billState, dropBill, droppingBill] = useActionState(removeBill, INITIAL);
  const said = useLastSaid(saveState, removeState, billState);

  return (
    <RowMenu
      label={`Actions for the ${cost.vendor} cost of ${cost.incurredOn}`}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setView('menu');
      }}
      wide={view === 'edit'}
    >
      {view === 'edit' && (
        <form action={save} className={forms.form}>
          <input type="hidden" name="costId" value={cost.id} />
          <CostFields
            choices={choices}
            values={cost}
            amountName="amount"
            amountLabel="Amount on the bill"
            withDate
            prefix={`edit-${cost.id}`}
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
          <input type="hidden" name="costId" value={cost.id} />
          <MenuTitle>Remove this cost from {cost.vendor}?</MenuTitle>
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
            {hasBill && (
              <form action={dropBill}>
                <input type="hidden" name="costId" value={cost.id} />
                <MenuItem type="submit" disabled={droppingBill}>
                  {droppingBill ? 'Taking it off…' : 'Take the bill off'}
                </MenuItem>
              </form>
            )}
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

/** This month's amount for a regular cost, starting from what it usually is. */
export function AddMonthOf({
  regular,
  date,
}: {
  regular: {
    id: string;
    vendor: string;
    category: string;
    description: string | null;
    usual: string;
    currency: string;
    clientId: string | null;
    projectId: string | null;
    productId: string | null;
  };
  /** The date the entry starts from. */
  date: string;
}) {
  const [state, action, pending] = useActionState(saveCost, INITIAL);
  if (state.status === 'done') return <span className={forms.hint}>{state.message}</span>;

  return (
    <form action={action} className={styles.inlineForm}>
      <input type="hidden" name="regularId" value={regular.id} />
      <input type="hidden" name="vendor" value={regular.vendor} />
      <input type="hidden" name="category" value={regular.category} />
      <input type="hidden" name="description" value={regular.description ?? ''} />
      <input type="hidden" name="currency" value={regular.currency} />
      <input type="hidden" name="clientId" value={regular.clientId ?? ''} />
      <input type="hidden" name="projectId" value={regular.projectId ?? ''} />
      <input type="hidden" name="productId" value={regular.productId ?? ''} />
      <input type="hidden" name="incurredOn" value={date} />
      <input
        name="amount"
        className={`${forms.control} ${forms.number}`}
        inputMode="decimal"
        defaultValue={regular.usual}
        aria-label={`This month's amount for ${regular.vendor}, in ${regular.currency}`}
        required
        disabled={pending}
      />
      <button type="submit" className={`${forms.button} ${forms.quiet}`} disabled={pending}>
        {pending ? 'Adding…' : 'Add'}
      </button>
      {state.status === 'error' && <span className={forms.error}>{state.message}</span>}
    </form>
  );
}

/** A regular cost's own choices: change what it usually is, or stop expecting it. */
export function RegularMenu({
  regular,
  choices,
}: {
  regular: {
    id: string;
    vendor: string;
    category: string;
    description: string | null;
    usual: string;
    currency: string;
    clientId: string | null;
    projectId: string | null;
    productId: string | null;
    isActive: boolean;
  };
  choices: Choices;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saveState, save, saving] = useActionState(
    async (previous: FinanceState, formData: FormData) => {
      const result = await saveRegularCost(previous, formData);
      if (result.status === 'done') setEditing(false);
      return result;
    },
    INITIAL,
  );
  const [activeState, setActive, switching] = useActionState(setRegularCostActive, INITIAL);
  const said = useLastSaid(saveState, activeState);

  return (
    <RowMenu
      label={`Actions for the regular ${regular.vendor} cost`}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setEditing(false);
      }}
      wide={editing}
    >
      {editing ? (
        <form action={save} className={forms.form}>
          <input type="hidden" name="regularId" value={regular.id} />
          <CostFields
            choices={choices}
            values={{ ...regular, amount: regular.usual }}
            amountName="usual"
            amountLabel="Usually"
            withDate={false}
            prefix={`regular-${regular.id}`}
            invalid={saveState.field}
          />
          <div className={forms.actions}>
            <button type="submit" className={forms.button} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className={`${forms.button} ${forms.quiet}`} onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
          <Message state={saveState} />
        </form>
      ) : (
        <>
          <MenuList>
            <MenuItem onClick={() => setEditing(true)}>Change</MenuItem>
            <form action={setActive}>
              <input type="hidden" name="regularId" value={regular.id} />
              <input type="hidden" name="active" value={regular.isActive ? 'off' : 'on'} />
              <MenuItem type="submit" disabled={switching}>
                {regular.isActive ? 'Stop expecting it' : 'Expect it again'}
              </MenuItem>
            </form>
          </MenuList>
          {said?.message && (
            <MenuNote tone={said.status === 'error' ? 'bad' : 'quiet'}>{said.message}</MenuNote>
          )}
        </>
      )}
    </RowMenu>
  );
}
