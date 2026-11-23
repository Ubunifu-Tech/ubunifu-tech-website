'use client';

import { useActionState, useRef, useState } from 'react';
import { SelectField, TextAreaField, TextField } from '@/components/console/Fields';
import {
  addCopilotNote,
  removeCopilotNote,
  saveAgentInstruction,
  type CopilotSettingsState,
} from './actions';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';

const INITIAL: CopilotSettingsState = { status: 'idle' };

function Result({ state }: { state: CopilotSettingsState }) {
  if (!state.message) return null;
  return (
    <p className={state.status === 'error' ? forms.error : forms.hint} role="status" aria-live="polite">
      {state.message}
    </p>
  );
}

/** One agent's house instructions. Read-only for anyone who is not an owner. */
export function InstructionForm({
  kind,
  label,
  text,
  limit,
  editable,
}: {
  kind: string;
  label: string;
  text: string;
  limit: number;
  editable: boolean;
}) {
  const [state, action, pending] = useActionState(saveAgentInstruction, INITIAL);
  const [value, setValue] = useState(text);

  if (!editable) {
    return text ? <p className={forms.quote}>{text}</p> : <p className={forms.hint}>Nothing written. Only an owner can add instructions.</p>;
  }
  return (
    <form action={action} className={forms.form}>
      <input type="hidden" name="kind" value={kind} />
      <TextAreaField
        name="text"
        label={`House instructions for ${label.toLowerCase()}`}
        optional
        rows={6}
        maxLength={limit}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Write as you would brief a new colleague. One instruction per line."
        hint={`${value.length.toLocaleString('en-GB')} of ${limit.toLocaleString('en-GB')} characters. Added to its built-in rules, which it keeps.`}
        disabled={pending}
      />
      <div className={forms.actions}>
        <button type="submit" className={forms.button} disabled={pending || value.trim() === text.trim()}>
          {pending ? 'Saving…' : 'Save'}
        </button>
        <Result state={state} />
      </div>
    </form>
  );
}

/** A new note for Copilot to keep in mind. Only an owner may save one for the whole team. */
export function AddNote({ owner }: { owner: boolean }) {
  const form = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(async (previous: CopilotSettingsState, formData: FormData) => {
    const result = await addCopilotNote(previous, formData);
    if (result.status === 'done') form.current?.reset();
    return result;
  }, INITIAL);

  return (
    <form ref={form} action={action} className={forms.form}>
      <div className={forms.grid}>
        <TextField
          name="text"
          label="Something to keep in mind"
          wide
          required
          maxLength={400}
          placeholder="Hosting is always billed yearly, in advance"
          disabled={pending}
        />
        <SelectField name="scope" label="For" defaultValue="me" disabled={pending}>
          <option value="me">Only me</option>
          {owner && <option value="team">The whole team</option>}
        </SelectField>
      </div>
      <div className={forms.actions}>
        <button type="submit" className={forms.button} disabled={pending}>
          {pending ? 'Saving…' : 'Add note'}
        </button>
        <Result state={state} />
      </div>
    </form>
  );
}

export function RemoveNote({ id }: { id: string }) {
  const [state, action, pending] = useActionState(removeCopilotNote, INITIAL);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className={table.action} disabled={pending}>
        {pending ? 'Removing…' : 'Remove'}
      </button>
      {state.status === 'error' && <Result state={state} />}
    </form>
  );
}
