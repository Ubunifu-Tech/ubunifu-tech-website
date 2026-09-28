'use client';

import { useRef } from 'react';
import styles from '../../Admin.module.css';
import forms from '@/styles/forms.module.css';

/**
 * The tick box. Its action state lives with the task row, which says why a
 * tick was refused under the task alongside its other problems.
 */
export function DeliverableToggle({
  id,
  title,
  complete,
  action,
  pending,
  disabled = false,
}: {
  id: string;
  title: string;
  complete: boolean;
  action: (formData: FormData) => void;
  pending: boolean;
  /** Shown but not tickable, for someone who neither runs projects nor holds the task. */
  disabled?: boolean;
}) {
  const form = useRef<HTMLFormElement>(null);

  return (
    <form action={action} ref={form} className={styles.checkItem}>
      <input type="hidden" name="deliverableId" value={id} />
      <input
        id={`deliverable-${id}`}
        name="complete"
        type="checkbox"
        className={forms.check}
        defaultChecked={complete}
        disabled={pending || disabled}
        // Submitted on change rather than behind a save button: ticking things
        // off is the single most repeated action on this screen.
        onChange={() => form.current?.requestSubmit()}
      />
      <label htmlFor={`deliverable-${id}`} className={complete ? styles.done : undefined}>
        {title}
      </label>
    </form>
  );
}
