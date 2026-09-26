'use client';

import React, { useActionState, useRef, useState } from 'react';
import { Select, type SelectOption } from '@/components/console/Select';
import { DatePicker } from '@/components/console/DatePicker';
import { DeliverableToggle } from './DeliverableToggle';
import { assignTask, setProjectLead, setTaskDue, type AssignState } from './assign-actions';
import { removeTask } from './plan-actions';
import { RemoveConfirm, RenameTask, RowTools } from './PlanEditor';
import styles from './TaskRow.module.css';

const INITIAL: AssignState = { status: 'idle' };

/** One task: done or not, when it is due, and who is doing it. */
export function TaskRow({
  id,
  title,
  complete,
  dueAt,
  assigneeId,
  people,
  teamOnly = false,
  editable = false,
  mine = false,
}: {
  id: string;
  title: string;
  complete: boolean;
  dueAt: string;
  assigneeId: string;
  people: readonly SelectOption[];
  /** Kept off the client's view of the plan. */
  teamOnly?: boolean;
  /**
   * The viewer runs projects: the task can be renamed, removed, rescheduled
   * and reassigned. Without it the row is read-only.
   */
  editable?: boolean;
  /** The viewer holds this task, so they can tick it done either way. */
  mine?: boolean;
}) {
  const [assignState, assign] = useActionState(assignTask, INITIAL);
  const [dueState, due] = useActionState(setTaskDue, INITIAL);
  const [mode, setMode] = useState<'view' | 'rename' | 'remove'>('view');
  const dueForm = useRef<HTMLFormElement>(null);
  const problem = assignState.status === 'error' ? assignState.message : dueState.message;

  if (mode === 'rename') {
    return (
      <div className={styles.row}>
        <div className={styles.wide}>
          <RenameTask id={id} title={title} teamOnly={teamOnly} onDone={() => setMode('view')} />
        </div>
      </div>
    );
  }
  if (mode === 'remove') {
    return (
      <div className={styles.row}>
        <div className={styles.wide}>
          <RemoveConfirm
            question={`Remove "${title}" from the plan?`}
            action={removeTask}
            hidden={{ deliverableId: id }}
            onCancel={() => setMode('view')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.row} ${editable ? styles.editable : ''}`}>
      <div className={styles.task}>
        <DeliverableToggle
          id={id}
          title={title}
          complete={complete}
          disabled={!editable && !mine}
        />
        {teamOnly && <span className={styles.teamOnly}>Team only</span>}
        {problem && <p className={styles.problem}>{problem}</p>}
      </div>
      <form action={due} ref={dueForm} className={styles.due}>
        <input type="hidden" name="deliverableId" value={id} />
        <DatePicker
          name="dueAt"
          defaultValue={dueAt}
          size="sm"
          placeholder="Due date"
          aria-label={`Due date for ${title}`}
          disabled={!editable}
          // The hidden input updates on the same render; submit after it has.
          onChange={() => requestAnimationFrame(() => dueForm.current?.requestSubmit())}
        />
      </form>
      <form action={assign} className={styles.assignee}>
        <input type="hidden" name="deliverableId" value={id} />
        <Select
          name="assigneeId"
          defaultValue={assigneeId}
          options={people}
          size="sm"
          autoSubmit
          aria-label={`Who is doing ${title}`}
          disabled={!editable}
        />
      </form>
      {editable && (
        <RowTools
          name={title}
          onEdit={() => setMode('rename')}
          onRemove={() => setMode('remove')}
        />
      )}
    </div>
  );
}

/** Who leads a project, changed where it is shown. */
export function LeadSelect({
  projectId,
  ownerId,
  people,
}: {
  projectId: string;
  ownerId: string;
  people: readonly SelectOption[];
}) {
  const [, action] = useActionState(setProjectLead, INITIAL);
  return (
    <form action={action} className={styles.lead}>
      <span className={styles.leadLabel}>Owner</span>
      <input type="hidden" name="projectId" value={projectId} />
      <Select
        name="ownerId"
        defaultValue={ownerId}
        options={people}
        size="sm"
        autoSubmit
        aria-label="Project owner"
      />
    </form>
  );
}
