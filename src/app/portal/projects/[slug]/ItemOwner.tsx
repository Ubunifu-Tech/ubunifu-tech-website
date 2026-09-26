'use client';

import { useActionState } from 'react';
import { Select, type SelectOption } from '@/components/console/Select';
import { assignMyItem, type AssignItemState } from './actions';
import styles from '../../Portal.module.css';

/** Who on your side is sending this. */
export function ItemOwner({
  id,
  title,
  assigneeId,
  people,
}: {
  id: string;
  title: string;
  assigneeId: string;
  people: readonly SelectOption[];
}) {
  const [state, action] = useActionState(assignMyItem, { status: 'idle' } as AssignItemState);
  return (
    <form action={action} className={styles.itemOwner}>
      <input type="hidden" name="assetRequestId" value={id} />
      <span className={styles.itemOwnerLabel}>Sent by</span>
      <Select
        name="assigneeId"
        defaultValue={assigneeId}
        options={people}
        size="sm"
        autoSubmit
        aria-label={`Who is sending ${title}`}
      />
      {state.status === 'error' && <span className={styles.itemOwnerError}>{state.message}</span>}
    </form>
  );
}
