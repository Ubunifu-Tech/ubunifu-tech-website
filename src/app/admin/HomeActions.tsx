'use client';

import { useActionState } from 'react';
import { moveProject, toggleDeliverable, type MoveState } from './projects/[slug]/actions';
import { createInvoice, type BillingState } from './invoices/actions';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';
import styles from './Admin.module.css';

/** Starts the work on a signed deal, asking first about anything it warns of. */
export function StartWork({ projectId, from }: { projectId: string; from: string }) {
  const [state, action, pending] = useActionState(moveProject, { status: 'idle' } as MoveState);
  const confirming = state.status === 'confirm';
  return (
    <form action={action} className={styles.rowAction}>
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="expectedFrom" value={from} />
      <input type="hidden" name="to" value="in_progress" />
      {confirming && <input type="hidden" name="acknowledged" value="on" />}
      {confirming &&
        state.guards?.map((guard) => (
          <p key={guard.message} className={styles.rowNote}>
            {guard.message}
          </p>
        ))}
      {state.status === 'error' && <p className={forms.error}>{state.message}</p>}
      <button type="submit" className={table.action} disabled={pending}>
        {pending ? 'Starting…' : confirming ? 'Start anyway' : 'Start the work'}
      </button>
    </form>
  );
}

/** Raises the draft invoice for one renewal period, then opens it to send. */
export function InvoiceIt({ projectId, billable, dueAt }: { projectId: string; billable: string; dueAt: string }) {
  const [state, action, pending] = useActionState(createInvoice, { status: 'idle' } as BillingState);
  return (
    <form action={action} className={styles.rowAction}>
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="billables" value={billable} />
      <input type="hidden" name="dueAt" value={dueAt} />
      {state.status === 'error' && <p className={forms.error}>{state.message}</p>}
      <button type="submit" className={table.action} disabled={pending}>
        {pending ? 'Raising…' : 'Invoice it'}
      </button>
    </form>
  );
}

/** Ticks one of your own tasks off. */
export function TaskDone({ deliverableId, title }: { deliverableId: string; title: string }) {
  const [state, action, pending] = useActionState(toggleDeliverable, { status: 'idle' });
  return (
    <form action={action} className={styles.rowAction}>
      <input type="hidden" name="deliverableId" value={deliverableId} />
      <input type="hidden" name="complete" value="on" />
      {state.status === 'error' && <p className={forms.error}>{state.message}</p>}
      <button type="submit" className={table.action} disabled={pending} aria-label={`Mark ${title} done`}>
        {pending ? 'Saving…' : 'Done'}
      </button>
    </form>
  );
}
