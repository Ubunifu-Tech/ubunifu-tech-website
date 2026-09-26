'use client';

import { useActionState, useState } from 'react';
import { saveClientDetails, type ClientDetailsState } from '../actions';
import { TextAreaField, TextField } from '@/components/console/Fields';
import { Select } from '@/components/console/Select';
import { MenuItem, MenuList, MenuNote, RowMenu } from '@/components/console/RowMenu';
import { CURRENCIES, currencyLabel } from '@/lib/console/currencies';
import forms from '@/styles/forms.module.css';

const INITIAL: ClientDetailsState = { status: 'idle' };

/** Changing a client's own details, from the "…" at the top of their page. */
export function ClientDetails({
  client,
}: {
  client: {
    id: string;
    name: string;
    legalName: string | null;
    country: string;
    currency: string;
    website: string | null;
    notes: string | null;
  };
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(
    async (previous: ClientDetailsState, formData: FormData) => {
      const result = await saveClientDetails(previous, formData);
      if (result.status === 'done') setEditing(false);
      return result;
    },
    INITIAL,
  );
  const invalid = (field: string) => (state.field === field ? true : undefined);

  return (
    <RowMenu
      label={`Actions for ${client.name}`}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setEditing(false);
      }}
      wide={editing}
    >
      {editing ? (
        <form action={action} className={forms.form}>
          <input type="hidden" name="clientId" value={client.id} />
          <TextField
            name="name"
            label="Name"
            defaultValue={client.name}
            required
            maxLength={160}
            invalid={invalid('name')}
          />
          <TextField
            name="legalName"
            label="Registered name"
            optional
            defaultValue={client.legalName ?? ''}
            maxLength={200}
            hint="As it should appear on invoices and agreements."
          />
          <TextField
            name="country"
            label="Country"
            defaultValue={client.country}
            required
            maxLength={2}
            hint="Two-letter code, such as TZ."
            invalid={invalid('country')}
          />
          <div className={forms.field}>
            <span className={forms.label}>Billing currency</span>
            <Select
              name="currency"
              defaultValue={client.currency}
              aria-label="Billing currency"
              options={CURRENCIES.map((code) => ({ value: code, label: currencyLabel(code) }))}
            />
            <p className={forms.hint}>For new projects. Projects already set up keep theirs.</p>
          </div>
          <TextField
            name="website"
            label="Website"
            type="url"
            optional
            defaultValue={client.website ?? ''}
            placeholder="https://"
            invalid={invalid('website')}
          />
          <TextAreaField
            name="notes"
            label="Notes"
            optional
            rows={4}
            defaultValue={client.notes ?? ''}
            maxLength={4000}
            hint="For the team only."
          />
          <div className={forms.actions}>
            <button type="submit" className={forms.button} disabled={pending}>
              {pending ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              className={`${forms.button} ${forms.quiet}`}
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
          {state.status === 'error' && (
            <p className={forms.error} role="status">
              {state.message}
            </p>
          )}
        </form>
      ) : (
        <>
          <MenuList>
            <MenuItem onClick={() => setEditing(true)}>Change details or notes</MenuItem>
          </MenuList>
          {state.message && (
            <MenuNote tone={state.status === 'error' ? 'bad' : 'quiet'}>{state.message}</MenuNote>
          )}
        </>
      )}
    </RowMenu>
  );
}
