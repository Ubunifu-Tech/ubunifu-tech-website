'use client';

import { useActionState, useId, useState } from 'react';
import Link from 'next/link';
import type { ProjectStatus } from '@/generated/prisma/client';
import { moveProject, type MoveState } from './actions';
import { MenuItem, MenuList, MenuNote, RowMenu } from '@/components/console/RowMenu';
import forms from '@/styles/forms.module.css';
import styles from './StageActions.module.css';

const INITIAL: MoveState = { status: 'idle' };

export type FixTab = 'fees' | 'billing' | 'documents' | 'updates' | 'overview' | 'review';

export type StageMove = {
  to: ProjectStatus;
  label: string;
  tone?: 'primary' | 'quiet' | 'danger';
  /** Said beside the button before it is pressed; pressing it accepts them. */
  warnings: { message: string; fix: FixTab | null }[];
  /** Why it cannot happen yet, and where that is put right. */
  blocked: { message: string; fix: FixTab | null } | null;
};

const FIX_LABEL: Record<FixTab, string> = {
  fees: 'Go to fees',
  billing: 'Go to billing',
  documents: 'Go to documents',
  updates: 'Go to updates',
  overview: 'See what the client still has to send',
  review: 'Go to the review',
};

const HAND_OFF: Record<FixTab, string> = {
  fees: 'Someone who can set fees needs to do this.',
  billing: 'Someone who handles invoices needs to do this.',
  documents: 'Someone who handles documents needs to do this.',
  updates: 'Someone who runs projects needs to do this.',
  overview: 'Someone who runs projects needs to do this.',
  review: 'Resume the work first to ask for a review.',
};

/**
 * The project's next move, in its header: one button for the move that takes
 * it on, a link for the next thing done elsewhere (such as sending the
 * agreement), Mark complete whenever it is on offer, and the rarer moves behind
 * the menu. The expected status travels
 * with the post, so a project someone else moved meanwhile is refused rather
 * than recorded with a history that never happened.
 */
export function StageActions({
  projectId,
  projectSlug,
  status,
  primary,
  complete,
  others,
  link,
  canOpen,
}: {
  projectId: string;
  projectSlug: string;
  status: ProjectStatus;
  primary: StageMove | null;
  /** Shown as its own button. What it warns of is asked about when it is pressed. */
  complete: StageMove | null;
  others: StageMove[];
  link: { label: string; href: string } | null;
  canOpen: Partial<Record<FixTab, boolean>>;
}) {
  const formId = useId();
  const [state, action, pending] = useActionState(moveProject, INITIAL);
  const [noting, setNoting] = useState(false);

  const fixHref = (tab: FixTab) =>
    tab === 'overview'
      ? `/projects/${projectSlug}#from-the-client`
      : tab === 'review'
        ? `/projects/${projectSlug}#review`
        : `/projects/${projectSlug}?tab=${tab === 'billing' ? 'fees' : tab}`;
  const fix = (tab: FixTab | null) =>
    !tab ? null : canOpen[tab] !== false ? (
      <Link href={fixHref(tab)} className={forms.link}>
        {FIX_LABEL[tab]}
      </Link>
    ) : (
      <span className={styles.handOff}>{HAND_OFF[tab]}</span>
    );

  // Each warning counts as read only for the move it was shown beside.
  const shown = [primary, ...others].flatMap(
    (move) => move?.warnings.map((warning) => `${move.to}|${warning.message}`) ?? [],
  );
  const confirming = state.status === 'confirm' && state.to;
  const confirmLabel = [primary, complete, ...others].find((move) => move?.to === state.to)?.label;

  if (!primary && !complete && !link && others.length === 0) return null;

  return (
    <form id={formId} action={action} className={styles.actions}>
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="expectedFrom" value={status} />
      {shown.map((value) => (
        <input key={value} type="hidden" name="shown" value={value} />
      ))}

      <div className={styles.buttons}>
        {link && (
          <Link href={link.href} className={`${forms.button} ${primary ? forms.quiet : ''}`}>
            {link.label}
          </Link>
        )}
        {complete && (
          <button
            type="submit"
            name="to"
            value={complete.to}
            className={`${forms.button} ${forms.quiet}`}
            disabled={pending}
          >
            {complete.label}
          </button>
        )}
        {primary && (
          <button
            type="submit"
            name="to"
            value={primary.to}
            className={forms.button}
            disabled={pending || primary.blocked !== null}
          >
            {pending ? 'Moving…' : primary.label}
          </button>
        )}
        {others.length > 0 && (
          <RowMenu label="More moves">
            <MenuList>
              {others.map((move) => (
                <MenuItem
                  key={move.to}
                  type="submit"
                  form={formId}
                  name="to"
                  value={move.to}
                  danger={move.tone === 'danger'}
                  disabled={pending || move.blocked !== null}
                >
                  {move.label}
                </MenuItem>
              ))}
            </MenuList>
            {others.some((move) => move.blocked || move.warnings.length > 0) && (
              <MenuNote>
                {others
                  .flatMap((move) => [
                    ...(move.blocked ? [`${move.label}: ${move.blocked.message}`] : []),
                    ...move.warnings.map((warning) => `${move.label}: ${warning.message}`),
                  ])
                  .join(' ')}
              </MenuNote>
            )}
          </RowMenu>
        )}
      </div>

      {primary?.blocked && (
        <p className={styles.line}>
          {primary.blocked.message} {fix(primary.blocked.fix)}
        </p>
      )}
      {primary &&
        !confirming &&
        primary.warnings.map((warning) => (
          <p key={warning.message} className={styles.line}>
            {warning.message} {fix(warning.fix)}
          </p>
        ))}

      {confirming && (
        <div className={styles.confirm} role="alert">
          {state.guards?.map((guard) => (
            <p key={guard.message} className={styles.line}>
              {guard.message}
            </p>
          ))}
          <input type="hidden" name="acknowledged" value="on" />
          <button type="submit" name="to" value={state.to} className={forms.button} disabled={pending}>
            {confirmLabel ? `${confirmLabel} anyway` : 'Move anyway'}
          </button>
        </div>
      )}

      {(primary || complete || others.length > 0) &&
        (noting ? (
          <textarea
            name="note"
            className={`${forms.control} ${forms.textarea} ${styles.note}`}
            maxLength={2000}
            placeholder="A note for the project history"
            aria-label="Note for the project history"
          />
        ) : (
          <button type="button" className={`${forms.link} ${styles.addNote}`} onClick={() => setNoting(true)}>
            Add a note
          </button>
        ))}

      {state.status === 'error' && (
        <p className={forms.error} role="alert">
          {state.message}
        </p>
      )}
      {state.status === 'done' && (
        <p className={styles.done} role="status">
          {state.message}
        </p>
      )}
    </form>
  );
}
