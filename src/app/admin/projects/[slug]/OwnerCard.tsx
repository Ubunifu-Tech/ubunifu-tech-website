'use client';

import React, { useActionState, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Check } from 'lucide-react';
import { Avatar } from '@/components/console/Avatar';
import { setProjectLead, type AssignState } from './assign-actions';
import styles from './OwnerCard.module.css';
import forms from '@/styles/forms.module.css';

const INITIAL: AssignState = { status: 'idle' };

type Person = { id: string; name: string; title: string | null; email?: string };

/**
 * Who leads the project, as a card of its own: their initials, name and
 * role, and for those who run projects a way to hand it to someone else.
 */
export function OwnerCard({
  projectId,
  owner,
  team,
  editable,
}: {
  projectId: string;
  owner: Person | null;
  /** Everyone on the team who can sign in, who it can be handed to. */
  team: Person[];
  editable: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    async (previous: AssignState, formData: FormData) => {
      const result = await setProjectLead(previous, formData);
      if (result.status === 'done') setOpen(false);
      return result;
    },
    INITIAL,
  );

  return (
    <section className={forms.card}>
      <div className={forms.cardHeader}>
        <h2 className={forms.cardTitle}>Owner</h2>
        {editable && (
          <Popover.Root open={open} onOpenChange={setOpen}>
            <Popover.Trigger className={forms.link}>
              {owner ? 'Reassign' : 'Choose an owner'}
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content className={styles.panel} align="end" sideOffset={6} collisionPadding={12}>
                <p className={styles.panelTitle}>Who should lead it?</p>
                <form action={action} className={styles.list}>
                  <input type="hidden" name="projectId" value={projectId} />
                  {team.map((person) => {
                    const current = person.id === owner?.id;
                    return (
                      <button
                        key={person.id}
                        type="submit"
                        name="ownerId"
                        value={person.id}
                        className={styles.option}
                        disabled={pending || current}
                        aria-current={current ? 'true' : undefined}
                      >
                        <Avatar name={person.name} size="sm" />
                        <span className={styles.optionText}>
                          <span className={styles.optionName}>{person.name}</span>
                          {person.title && <span className={styles.optionTitle}>{person.title}</span>}
                        </span>
                        {current && (
                          <Check size={16} strokeWidth={2} className={styles.check} aria-hidden="true" />
                        )}
                      </button>
                    );
                  })}
                  {owner && (
                    <button
                      type="submit"
                      name="ownerId"
                      value=""
                      className={`${styles.option} ${styles.nobody}`}
                      disabled={pending}
                    >
                      Nobody for now
                    </button>
                  )}
                </form>
                {state.status === 'error' && (
                  <p className={forms.error} role="alert">
                    {state.message}
                  </p>
                )}
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        )}
      </div>

      {owner ? (
        <div className={styles.owner}>
          <Avatar name={owner.name} size="lg" />
          <div className={styles.who}>
            <p className={styles.name}>{owner.name}</p>
            <p className={styles.meta}>
              {[owner.title, owner.email].filter(Boolean).join(' · ') || 'On the team'}
            </p>
          </div>
        </div>
      ) : (
        <p className={styles.empty}>
          {editable ? 'Nobody leads it yet. Choose who does.' : 'Nobody leads it yet.'}
        </p>
      )}
      {state.status === 'done' && state.message && (
        <p className={forms.hint} role="status">
          {state.message}
        </p>
      )}
    </section>
  );
}
