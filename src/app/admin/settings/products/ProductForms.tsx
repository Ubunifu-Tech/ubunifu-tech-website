'use client';

import React, { useActionState, useState } from 'react';
import { MenuItem, MenuList, MenuNote, RowMenu, useLastSaid } from '@/components/console/RowMenu';
import { TextField } from '@/components/console/Fields';
import { saveProduct, setProductActive, type ProductState } from './actions';
import styles from '../../Admin.module.css';
import forms from '@/styles/forms.module.css';

const INITIAL: ProductState = { status: 'idle' };

/** Adding a product. */
export function AddProduct() {
  const [state, action, pending] = useActionState(saveProduct, INITIAL);
  const [round, setRound] = useState(0);
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state.status === 'done') setRound(round + 1);
  }
  return (
    <form key={round} action={action} className={styles.inlineForm}>
      <label className={forms.label} htmlFor={`product-${round}`}>
        Name
      </label>
      <input
        id={`product-${round}`}
        name="name"
        className={forms.control}
        maxLength={80}
        placeholder="A new product"
        required
        disabled={pending}
      />
      <button type="submit" className={`${forms.button} ${forms.quiet}`} disabled={pending}>
        {pending ? 'Adding…' : 'Add'}
      </button>
      {state.message && (
        <span className={state.status === 'error' ? forms.error : forms.hint} role="status">
          {state.message}
        </span>
      )}
    </form>
  );
}

/** A product's own choices: rename it, or stop offering it. */
export function ProductMenu({
  product,
}: {
  product: { id: string; name: string; isActive: boolean };
}) {
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [saveState, save, saving] = useActionState(
    async (previous: ProductState, formData: FormData) => {
      const result = await saveProduct(previous, formData);
      if (result.status === 'done') setRenaming(false);
      return result;
    },
    INITIAL,
  );
  const [activeState, setActive, switching] = useActionState(setProductActive, INITIAL);
  const said = useLastSaid(saveState, activeState);

  return (
    <RowMenu
      label={`Actions for ${product.name}`}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setRenaming(false);
      }}
      wide={renaming}
    >
      {renaming ? (
        <form action={save} className={forms.form}>
          <input type="hidden" name="productId" value={product.id} />
          <TextField name="name" label="Name" defaultValue={product.name} maxLength={80} required />
          <div className={forms.actions}>
            <button type="submit" className={forms.button} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              className={`${forms.button} ${forms.quiet}`}
              onClick={() => setRenaming(false)}
            >
              Cancel
            </button>
          </div>
          {saveState.status === 'error' && (
            <p className={forms.error} role="alert">
              {saveState.message}
            </p>
          )}
        </form>
      ) : (
        <>
          <MenuList>
            <MenuItem onClick={() => setRenaming(true)}>Rename</MenuItem>
            <form action={setActive}>
              <input type="hidden" name="productId" value={product.id} />
              <input type="hidden" name="active" value={product.isActive ? 'off' : 'on'} />
              <MenuItem type="submit" disabled={switching}>
                {product.isActive ? 'Stop offering it' : 'Offer it again'}
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
