'use client';

import { useActionState, useId, useState } from 'react';
import {
  removeEnquiry,
  reopenEnquiry,
  restoreEnquiry,
  saveEnquiryDetails,
  setEnquiryStatus,
  type TriageState,
} from '../actions';
import { MenuItem, MenuList, MenuNote, RowMenu, useLastSaid } from '@/components/console/RowMenu';
import { Select } from '@/components/console/Select';
import { SERVICE_LINES } from '@/lib/console/project-status';
import styles from '../../Admin.module.css';
import forms from '@/styles/forms.module.css';

const INITIAL: TriageState = { status: 'idle' };

/** The team's note and what kind of work it is, under one Save. */
export function EnquiryDetails({
  id,
  note,
  serviceLine,
}: {
  id: string;
  note: string | null;
  serviceLine: string | null;
}) {
  const [state, action, pending] = useActionState(saveEnquiryDetails, INITIAL);
  const ids = useId();

  return (
    <form action={action} className={forms.form}>
      <input type="hidden" name="id" value={id} />
      <div className={forms.field}>
        <label className={forms.label} htmlFor={`${ids}-line`}>
          What the work is
        </label>
        <Select
          id={`${ids}-line`}
          name="serviceLine"
          defaultValue={serviceLine ?? undefined}
          placeholder="Not decided"
          options={SERVICE_LINES}
          disabled={pending}
        />
      </div>
      <div className={forms.field}>
        <label className={forms.label} htmlFor={`${ids}-note`}>
          Note <span className={forms.optional}>(only the team sees it)</span>
        </label>
        <textarea
          id={`${ids}-note`}
          name="internalNote"
          defaultValue={note ?? ''}
          className={`${forms.control} ${forms.textarea}`}
          maxLength={2000}
          disabled={pending}
        />
      </div>
      <div className={styles.inlineForm}>
        <button type="submit" className={`${forms.button} ${forms.quiet}`} disabled={pending}>
          {pending ? 'Saving…' : 'Save'}
        </button>
        {state.message && (
          <span className={state.status === 'error' ? forms.error : forms.hint} role="status" aria-live="polite">
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}

/**
 * The rarer outcomes, behind the header menu: not for us, spam, back to open,
 * and removing it, which asks first.
 */
export function EnquiryMenu({
  id,
  name,
  status,
  reopenable,
}: {
  id: string;
  name: string;
  status: string;
  /** It became a client that has since been removed, so it can be opened again. */
  reopenable: boolean;
}) {
  const formId = useId();
  const [moveState, moveAction, movePending] = useActionState(setEnquiryStatus, INITIAL);
  const [removeState, removeAction, removePending] = useActionState(removeEnquiry, INITIAL);
  const [reopenState, reopenAction, reopenPending] = useActionState(reopenEnquiry, INITIAL);
  const [confirming, setConfirming] = useState(false);
  const said = useLastSaid(moveState, removeState, reopenState);
  const closed = status === 'declined' || status === 'spam';
  const converted = status === 'converted';
  const pending = movePending || removePending || reopenPending;

  return (
    <RowMenu label={`More for ${name}`}>
      <form id={formId} action={moveAction}>
        <input type="hidden" name="id" value={id} />
      </form>
      {confirming ? (
        <form action={removeAction}>
          <input type="hidden" name="id" value={id} />
          <MenuNote>It leaves every list and count. Nothing is sent to them.</MenuNote>
          <MenuList>
            <MenuItem type="submit" danger disabled={pending}>
              {removePending ? 'Removing…' : 'Remove'}
            </MenuItem>
            <MenuItem onClick={() => setConfirming(false)} disabled={pending}>
              Keep
            </MenuItem>
          </MenuList>
        </form>
      ) : (
        <MenuList>
          {!converted && closed && (
            <MenuItem type="submit" form={formId} name="status" value="new" disabled={pending}>
              Back to open
            </MenuItem>
          )}
          {!converted && status !== 'declined' && (
            <MenuItem type="submit" form={formId} name="status" value="declined" disabled={pending}>
              Not for us
            </MenuItem>
          )}
          {!converted && status !== 'spam' && (
            <MenuItem type="submit" form={formId} name="status" value="spam" disabled={pending}>
              Spam
            </MenuItem>
          )}
          {reopenable && (
            <form action={reopenAction}>
              <input type="hidden" name="id" value={id} />
              <MenuItem type="submit" disabled={pending}>
                Open it again
              </MenuItem>
            </form>
          )}
          <MenuItem danger onClick={() => setConfirming(true)} disabled={pending}>
            Remove
          </MenuItem>
        </MenuList>
      )}
      {said && <MenuNote tone={said.status === 'error' ? 'bad' : 'quiet'}>{said.message}</MenuNote>}
    </RowMenu>
  );
}

/** A removed enquiry, brought back into the lists. */
export function RestoreEnquiry({ id }: { id: string }) {
  const [state, action, pending] = useActionState(restoreEnquiry, INITIAL);
  return (
    <form action={action} className={styles.inlineForm}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className={forms.button} disabled={pending}>
        {pending ? 'Bringing it back…' : 'Bring it back'}
      </button>
      {state.status === 'error' && (
        <span className={forms.error} role="status" aria-live="polite">
          {state.message}
        </span>
      )}
    </form>
  );
}
