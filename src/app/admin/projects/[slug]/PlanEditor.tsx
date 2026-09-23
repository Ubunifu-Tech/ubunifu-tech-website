'use client';

import React, { useActionState, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import {
  addAssetRequest,
  addPhase,
  addTask,
  removePhase,
  renameTask,
  updateAssetRequest,
  updatePhase,
  updateProjectDetails,
  type PlanState,
} from './plan-actions';
import {
  CheckField,
  DateField,
  SelectField,
  TextAreaField,
  TextField,
} from '@/components/console/Fields';
import { CURRENCIES, currencyLabel } from '@/lib/console/currencies';
import { ENGAGEMENTS, SERVICE_LINES } from '@/lib/console/project-status';
import forms from '@/styles/forms.module.css';
import styles from '../../Admin.module.css';

/**
 * Building a project by hand, on the project page: its details, its phases and
 * tasks, and what we need from the client. Each piece reads as it always did
 * and turns into its form in place, so nobody leaves the page to change it.
 */

const IDLE: PlanState = { status: 'idle' };

type Action = (previous: PlanState, formData: FormData) => Promise<PlanState>;

/**
 * The action, followed by closing the form once it has worked. Closing from
 * inside the action lands in the same update as its result, where closing
 * while rendering would change the parent mid-render.
 */
function closing(action: Action, close: () => void): Action {
  return async (previous, formData) => {
    const result = await action(previous, formData);
    if (result.status === 'done') close();
    return result;
  };
}

function Problem({ state }: { state: PlanState }) {
  if (state.status !== 'error') return null;
  return (
    <p className={forms.error} role="alert">
      {state.message}
    </p>
  );
}

function Buttons({
  pending,
  label,
  onCancel,
  cancel = 'Cancel',
}: {
  pending: boolean;
  label: string;
  onCancel: () => void;
  cancel?: string;
}) {
  return (
    <div className={forms.actions}>
      <button type="submit" className={forms.button} disabled={pending}>
        {pending ? 'Saving…' : label}
      </button>
      <button type="button" className={`${forms.button} ${forms.quiet}`} onClick={onCancel}>
        {cancel}
      </button>
    </div>
  );
}

/** A pencil and a bin, for a row that can be changed or removed. */
export function RowTools({
  name,
  onEdit,
  onRemove,
}: {
  name: string;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <span className={styles.rowTools}>
      <button
        type="button"
        className={styles.iconAction}
        onClick={onEdit}
        aria-label={`Change ${name}`}
        title="Change"
      >
        <Pencil size={14} strokeWidth={2} aria-hidden="true" />
      </button>
      <button
        type="button"
        className={styles.iconAction}
        onClick={onRemove}
        aria-label={`Remove ${name}`}
        title="Remove"
      >
        <Trash2 size={14} strokeWidth={2} aria-hidden="true" />
      </button>
    </span>
  );
}

/** The second press before anything is removed, asked as a question. */
export function RemoveConfirm({
  question,
  action,
  hidden,
  onCancel,
}: {
  question: string;
  action: Action;
  hidden: Record<string, string>;
  onCancel: () => void;
}) {
  const [state, run, pending] = useActionState(action, IDLE);
  return (
    <form action={run} className={styles.confirmRow}>
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <span className={styles.confirmText}>{question}</span>
      <span className={styles.confirmButtons}>
        <button type="submit" className={`${forms.button} ${forms.danger}`} disabled={pending}>
          {pending ? 'Removing…' : 'Remove'}
        </button>
        <button type="button" className={`${forms.button} ${forms.quiet}`} onClick={onCancel}>
          Keep it
        </button>
      </span>
      <Problem state={state} />
    </form>
  );
}

// ── Project details ─────────────────────────────────────────────────────

export type ProjectDetails = {
  id: string;
  name: string;
  summary: string;
  serviceLine: string;
  engagementType: string;
  currency: string;
  startDate: string;
  targetDate: string;
  /** Why the currency cannot change now, or null while it still can. */
  currencyFixed: string | null;
};

/** The project's own facts, read as a list and changed in place. */
export function ProjectDetailsCard({
  details,
  editable,
  children,
}: {
  details: ProjectDetails;
  editable: boolean;
  /** How the details read when nobody is changing them. */
  children: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(
    closing(updateProjectDetails, () => setEditing(false)),
    IDLE,
  );

  return (
    <section className={forms.card}>
      <div className={forms.cardHeader}>
        <h2 className={forms.cardTitle}>Details</h2>
        {editable && !editing && (
          <button type="button" className={forms.link} onClick={() => setEditing(true)}>
            Change
          </button>
        )}
      </div>
      {!editing ? (
        children
      ) : (
        <form action={action} className={forms.form}>
          <input type="hidden" name="projectId" value={details.id} />
          <div className={forms.grid}>
            <TextField
              name="name"
              label="Name"
              wide
              defaultValue={details.name}
              maxLength={160}
              required
              invalid={state.field === 'name'}
            />
            <TextAreaField
              name="summary"
              label="What the work is"
              optional
              wide
              rows={3}
              defaultValue={details.summary}
              maxLength={2000}
              hint="The client reads this in their portal."
              invalid={state.field === 'summary'}
            />
            <DateField name="startDate" label="Start" optional defaultValue={details.startDate} />
            <DateField
              name="targetDate"
              label="Target"
              optional
              defaultValue={details.targetDate}
              invalid={state.field === 'targetDate'}
            />
            <SelectField name="serviceLine" label="Service" defaultValue={details.serviceLine}>
              {SERVICE_LINES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectField>
            <SelectField
              name="engagementType"
              label="How it is billed"
              defaultValue={details.engagementType}
            >
              {ENGAGEMENTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectField>
            {details.currencyFixed ? (
              <div className={forms.field}>
                <input type="hidden" name="currency" value={details.currency} />
                <span className={forms.label}>Currency</span>
                <p className={styles.fixedValue}>{currencyLabel(details.currency)}</p>
                <p className={forms.hint}>{details.currencyFixed}</p>
              </div>
            ) : (
              <SelectField
                name="currency"
                label="Currency"
                defaultValue={details.currency}
                hint="Fees and invoices on this project are charged in it."
                invalid={state.field === 'currency'}
              >
                {CURRENCIES.map((code) => (
                  <option key={code} value={code}>
                    {currencyLabel(code)}
                  </option>
                ))}
              </SelectField>
            )}
          </div>
          <Buttons pending={pending} label="Save" onCancel={() => setEditing(false)} />
          <Problem state={state} />
        </form>
      )}
    </section>
  );
}

// ── Phases ──────────────────────────────────────────────────────────────

export type PhaseRow = {
  id: string;
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
};

function PhaseForm({
  projectId,
  phase,
  onDone,
}: {
  projectId: string;
  phase?: PhaseRow;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState(
    closing(phase ? updatePhase : addPhase, onDone),
    IDLE,
  );
  return (
    <form action={action} className={`${forms.form} ${styles.planForm}`}>
      {phase ? (
        <input type="hidden" name="phaseId" value={phase.id} />
      ) : (
        <input type="hidden" name="projectId" value={projectId} />
      )}
      <div className={forms.grid}>
        <TextField
          name="name"
          label="Phase"
          wide
          defaultValue={phase?.name}
          maxLength={160}
          required
          autoFocus
          placeholder="Structure and design"
          invalid={state.field === 'name'}
        />
        <TextField
          name="goal"
          label="What it achieves"
          optional
          wide
          defaultValue={phase?.goal}
          maxLength={1000}
          invalid={state.field === 'goal'}
        />
        <DateField name="startDate" label="From" optional defaultValue={phase?.startDate} />
        <DateField
          name="endDate"
          label="To"
          optional
          defaultValue={phase?.endDate}
          invalid={state.field === 'endDate'}
        />
      </div>
      <Buttons pending={pending} label={phase ? 'Save' : 'Add the phase'} onCancel={onDone} />
      <Problem state={state} />
    </form>
  );
}

/** A phase's heading, which turns into its form or its removal question. */
export function PhaseHead({
  phase,
  taskCount,
  editable,
  children,
}: {
  phase: PhaseRow;
  taskCount: number;
  editable: boolean;
  /** The heading as it reads. */
  children: React.ReactNode;
}) {
  const [mode, setMode] = useState<'view' | 'edit' | 'remove'>('view');
  if (mode === 'edit') {
    return <PhaseForm projectId="" phase={phase} onDone={() => setMode('view')} />;
  }
  if (mode === 'remove') {
    return (
      <RemoveConfirm
        question={
          taskCount > 0
            ? `Remove ${phase.name} and its ${taskCount} ${taskCount === 1 ? 'task' : 'tasks'}?`
            : `Remove ${phase.name}?`
        }
        action={removePhase}
        hidden={{ phaseId: phase.id }}
        onCancel={() => setMode('view')}
      />
    );
  }
  return (
    <div className={styles.phaseHead}>
      {children}
      {editable && (
        <RowTools
          name={phase.name}
          onEdit={() => setMode('edit')}
          onRemove={() => setMode('remove')}
        />
      )}
    </div>
  );
}

export function AddPhase({ projectId, first }: { projectId: string; first: boolean }) {
  const [open, setOpen] = useState(false);
  if (open) return <PhaseForm projectId={projectId} onDone={() => setOpen(false)} />;
  return (
    <button
      type="button"
      className={`${forms.button} ${forms.quiet} ${styles.addButton}`}
      onClick={() => setOpen(true)}
    >
      <Plus size={16} strokeWidth={2} aria-hidden="true" />
      {first ? 'Add the first phase' : 'Add a phase'}
    </button>
  );
}

// ── Tasks ───────────────────────────────────────────────────────────────

/** Tasks go in one after another: the form stays open until Done. */
export function AddTask({ phaseId }: { phaseId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(addTask, IDLE);
  if (!open) {
    return (
      <button
        type="button"
        className={`${forms.link} ${styles.addTask}`}
        onClick={() => setOpen(true)}
      >
        Add a task
      </button>
    );
  }
  return (
    <form action={action} className={`${forms.form} ${styles.planForm}`}>
      <input type="hidden" name="phaseId" value={phaseId} />
      <div className={forms.grid}>
        <TextField
          name="title"
          label="Task"
          wide
          maxLength={300}
          required
          autoFocus
          placeholder="Home page layout"
          invalid={state.field === 'title'}
        />
        <DateField name="dueAt" label="Due" optional invalid={state.field === 'dueAt'} />
        <CheckField
          name="private"
          label="Only the team sees it"
          hint="Leave it unticked and the client sees it in their plan."
        />
      </div>
      <Buttons pending={pending} label="Add" onCancel={() => setOpen(false)} cancel="Done" />
      {state.status === 'done' && (
        <p className={forms.hint} role="status">
          Added. Add another, or press Done.
        </p>
      )}
      <Problem state={state} />
    </form>
  );
}

export function RenameTask({
  id,
  title,
  onDone,
}: {
  id: string;
  title: string;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState(closing(renameTask, onDone), IDLE);
  return (
    <form action={action} className={styles.confirmRow}>
      <input type="hidden" name="deliverableId" value={id} />
      <input
        name="title"
        className={`${forms.control} ${styles.renameInput}`}
        defaultValue={title}
        maxLength={300}
        aria-label="Task"
        required
        autoFocus
      />
      <span className={styles.confirmButtons}>
        <button type="submit" className={forms.button} disabled={pending}>
          {pending ? 'Saving…' : 'Save'}
        </button>
        <button type="button" className={`${forms.button} ${forms.quiet}`} onClick={onDone}>
          Cancel
        </button>
      </span>
      <Problem state={state} />
    </form>
  );
}

// ── What we need from the client ────────────────────────────────────────

function AssetRequestForm({
  projectId,
  request,
  onDone,
}: {
  projectId: string;
  request?: { id: string; title: string; detail: string };
  onDone: () => void;
}) {
  // A change closes the form. A new request leaves it open for the next one,
  // and React clears the fields once the action has run.
  const [state, action, pending] = useActionState(
    request ? closing(updateAssetRequest, onDone) : addAssetRequest,
    IDLE,
  );
  return (
    <form action={action} className={`${forms.form} ${styles.planForm}`}>
      {request ? (
        <input type="hidden" name="assetRequestId" value={request.id} />
      ) : (
        <input type="hidden" name="projectId" value={projectId} />
      )}
      <TextField
        name="title"
        label="What you need"
        defaultValue={request?.title}
        required
        autoFocus
        maxLength={200}
        placeholder="Founder bio and story"
        invalid={state.field === 'title'}
      />
      <TextAreaField
        name="detail"
        label="More about it"
        optional
        rows={2}
        defaultValue={request?.detail}
        maxLength={1000}
        hint="They can write an answer or attach files."
        invalid={state.field === 'detail'}
      />
      <Buttons
        pending={pending}
        label={request ? 'Save' : 'Add'}
        onCancel={onDone}
        cancel={request ? 'Cancel' : 'Done'}
      />
      {!request && state.status === 'done' && (
        <p className={forms.hint} role="status">
          Added. Ask for something else, or press Done.
        </p>
      )}
      <Problem state={state} />
    </form>
  );
}

export function AskForSomething({ projectId, first }: { projectId: string; first: boolean }) {
  const [open, setOpen] = useState(false);
  if (open) return <AssetRequestForm projectId={projectId} onDone={() => setOpen(false)} />;
  return (
    <button
      type="button"
      className={`${forms.button} ${forms.quiet} ${styles.addButton}`}
      onClick={() => setOpen(true)}
    >
      <Plus size={16} strokeWidth={2} aria-hidden="true" />
      {first ? 'Ask them for something' : 'Ask for something else'}
    </button>
  );
}

export function EditAssetRequest({
  id,
  title,
  detail,
  onDone,
}: {
  id: string;
  title: string;
  detail: string;
  onDone: () => void;
}) {
  return <AssetRequestForm projectId="" request={{ id, title, detail }} onDone={onDone} />;
}
