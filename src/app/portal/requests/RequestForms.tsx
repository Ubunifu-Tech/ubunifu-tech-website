'use client';

import React, { useActionState, useState } from 'react';
import { raiseRequest, replyToRequest, type RequestState } from './actions';
import { TICKET_KINDS } from '@/lib/console/tickets';
import forms from '@/styles/forms.module.css';
import { Select } from '@/components/console/Select';

const INITIAL: RequestState = { status: 'idle' };

/**
 * Asking us for something.
 *
 * No priority field. Everything a client raises is urgent to the client, and
 * asking them to rank it either produces all-urgent or makes them feel they
 * are being sorted. We set that on triage, where the comparison across clients
 * can actually be made.
 */
export function RaiseRequestForm({
  projects,
}: {
  projects: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(raiseRequest, INITIAL);
  const [kind, setKind] = useState<string>(TICKET_KINDS[0].value);

  const chosen = TICKET_KINDS.find((option) => option.value === kind);

  return (
    <form action={action} className={forms.form}>
      <div className={forms.grid}>
        <div className={forms.field}>
          <label className={forms.label} htmlFor="req-kind">
            What do you need?
          </label>
          <Select
              id="req-kind"
              name="kind"
              value={kind}
              onValueChange={setKind}
              options={TICKET_KINDS}
              disabled={pending}
            />
          {chosen && <p className={forms.hint}>{chosen.hint}</p>}
        </div>

        {projects.length > 0 && (
          <div className={forms.field}>
            <label className={forms.label} htmlFor="req-project">
              Which project <span className={forms.optional}>(optional)</span>
            </label>
            <Select
                id="req-project"
                name="projectId"
                defaultValue=""
                options={[
                  { value: '', label: 'Not about a particular project' },
                  ...projects.map((project) => ({ value: project.id, label: project.name })),
                ]}
                disabled={pending}
              />
          </div>
        )}

        <div className={`${forms.field} ${forms.wide}`}>
          <label className={forms.label} htmlFor="req-subject">
            In a few words
          </label>
          <input
            id="req-subject"
            name="subject"
            className={forms.control}
            maxLength={160}
            required
            placeholder="The contact form is not reaching us"
            disabled={pending}
          />
        </div>

        <div className={`${forms.field} ${forms.wide}`}>
          <label className={forms.label} htmlFor="req-body">
            Tell us what is happening
          </label>
          <textarea
            id="req-body"
            name="body"
            className={`${forms.control} ${forms.textarea}`}
            maxLength={8000}
            required
            placeholder="What you expected, what happened instead, and when you first noticed. If it is a change you want, describe it as you would say it out loud."
            disabled={pending}
          />
          <p className={forms.hint}>
            There is no wrong way to write this. Detail helps, but a sentence is fine. We will ask
            if we need more.
          </p>
        </div>
      </div>

      <div className={forms.actions}>
        <button type="submit" className={forms.button} disabled={pending}>
          {pending ? 'Sending…' : 'Send it to us'}
        </button>
        <p className={forms.payoff}>
          Saved the moment you send it, and you can follow it here. We will reply in the same
          place.
        </p>
      </div>

      {state.message && (
        <p className={forms.error} role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}

export function ReplyForm({ ticketId, closed }: { ticketId: string; closed: boolean }) {
  const [state, action, pending] = useActionState(replyToRequest, INITIAL);

  if (closed) {
    return (
      <p className={forms.hint}>
        This one is closed. If it comes back, raise a new request and we will pick it up.
      </p>
    );
  }

  return (
    <form action={action} className={forms.form}>
      <input type="hidden" name="ticketId" value={ticketId} />
      <div className={forms.field}>
        <label className={forms.label} htmlFor="reply-body">
          Add to this
        </label>
        <textarea
          id="reply-body"
          name="body"
          className={`${forms.control} ${forms.textarea}`}
          maxLength={8000}
          required
          disabled={pending}
        />
      </div>
      <div className={forms.actions}>
        <button type="submit" className={forms.button} disabled={pending}>
          {pending ? 'Sending…' : 'Send'}
        </button>
      </div>
      {state.message && (
        <p
          className={state.status === 'error' ? forms.error : forms.hint}
          role="status"
          aria-live="polite"
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
