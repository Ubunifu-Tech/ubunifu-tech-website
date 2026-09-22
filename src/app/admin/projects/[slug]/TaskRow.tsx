'use client';

import React, { useActionState, useRef } from 'react';
import { Select, type SelectOption } from '@/components/console/Select';
import { DatePicker } from '@/components/console/DatePicker';
import { DeliverableToggle } from './DeliverableToggle';
import { assignTask, setProjectLead, setTaskDue, type AssignState } from './assign-actions';
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
}: {
  id: string;
  title: string;
  complete: boolean;
  dueAt: string;
  assigneeId: string;
  people: readonly SelectOption[];
}) {
  const [assignState, assign] = useActionState(assignTask, INITIAL);
  const [dueState, due] = useActionState(setTaskDue, INITIAL);
  const dueForm = useRef<HTMLFormElement>(null);
  const problem = assignState.status === 'error' ? assignState.message : dueState.message;

  return (
    <div className={styles.row}>
      <div className={styles.task}>
        <DeliverableToggle id={id} title={title} complete={complete} />
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
        />
      </form>
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
      <span className={styles.leadLabel}>Lead</span>
      <input type="hidden" name="projectId" value={projectId} />
      <Select
        name="ownerId"
        defaultValue={ownerId}
        options={people}
        size="sm"
        autoSubmit
        aria-label="Project lead"
      />
    </form>
  );
}
