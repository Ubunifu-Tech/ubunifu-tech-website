'use client';

import { useActionState } from 'react';
import { replyToTicket, triageTicket, type TicketState } from './actions';
import { STAFF_TICKET_STATUS, TICKET_PRIORITY_LABEL } from '@/lib/console/tickets';
import styles from '../Admin.module.css';
import forms from '@/styles/forms.module.css';
import { Select } from '@/components/console/Select';

const INITIAL: TicketState = { status: 'idle' };

function Result({ state }: { state: TicketState }) {
  if (!state.message) return null;
  return (
    <p
      className={state.status === 'error' ? forms.error : forms.hint}
      role="status"
      aria-live="polite"
    >
      {state.message}
    </p>
  );
}

/**
 * One box for both a reply and an internal note.
 *
 * They are the same act from where a staff member sits, and two separate
 * screens is how a note ends up in a reply. Unticked by default, because the
 * safe mistake is telling a client something they already knew.
 */
export function ReplyBox({ ticketId }: { ticketId: string }) {
  const [state, action, pending] = useActionState(replyToTicket, INITIAL);

  return (
    <form action={action} className={forms.form}>
      <input type="hidden" name="ticketId" value={ticketId} />
      <div className={forms.field}>
        <label className={forms.label} htmlFor="ticket-body">
          Your reply
        </label>
        <textarea
          id="ticket-body"
          name="body"
          className={`${forms.control} ${forms.textarea}`}
          maxLength={8000}
          required
          disabled={pending}
        />
      </div>

      <label className={forms.checkRow} htmlFor="ticket-internal">
        <input
          id="ticket-internal"
          name="isInternal"
          type="checkbox"
          className={forms.check}
          disabled={pending}
        />
        <span className={forms.checkText}>
          <span>Keep this to ourselves</span>
          <span className={forms.hint}>
            A note for the team. It never appears in their portal and is never emailed.
          </span>
        </span>
      </label>

      <div className={forms.actions}>
        <button type="submit" className={forms.button} disabled={pending}>
          {pending ? 'Sending…' : 'Send'}
        </button>
        <p className={forms.payoff}>
          A reply goes to whoever raised it and moves this to &ldquo;being worked on&rdquo;.
        </p>
      </div>
      <Result state={state} />
    </form>
  );
}

export function TriageBox({
  ticketId,
  status,
  priority,
}: {
  ticketId: string;
  status: string;
  priority: string;
}) {
  const [state, action, pending] = useActionState(triageTicket, INITIAL);

  return (
    <form action={action} className={forms.form}>
      <input type="hidden" name="ticketId" value={ticketId} />
      <div className={forms.grid}>
        <div className={forms.field}>
          <label className={forms.label} htmlFor="ticket-status">
            Where it stands
          </label>
          <Select
              id="ticket-status"
              name="ticketStatus"
              defaultValue={status}
              options={Object.entries(STAFF_TICKET_STATUS).map(([value, label]) => ({ value, label }))}
              disabled={pending}
            />
        </div>

        <div className={forms.field}>
          <label className={forms.label} htmlFor="ticket-priority">
            How much it matters
          </label>
          <Select
              id="ticket-priority"
              name="priority"
              defaultValue={priority}
              options={Object.entries(TICKET_PRIORITY_LABEL).map(([value, label]) => ({ value, label }))}
              disabled={pending}
            />
          <p className={forms.hint}>
            Only the team sees this.
          </p>
        </div>
      </div>

      <div className={styles.inlineForm}>
        <button type="submit" className={`${forms.button} ${forms.quiet}`} disabled={pending}>
          {pending ? 'Saving…' : 'Save'}
        </button>
        <Result state={state} />
      </div>
    </form>
  );
}
