'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { CalendarDays, Clock, UserRound, X } from 'lucide-react';
import type { ProjectStatus } from '@/generated/prisma/client';
import { LANES, laneOf, targetIn, type Lane } from '@/lib/console/board';
import { STAFF_LABEL, STATUS_TONE } from '@/lib/console/project-status';
import { toneClass } from '@/components/console/Tone';
import { moveProject } from './[slug]/actions';
import forms from '@/styles/forms.module.css';
import styles from './Board.module.css';

export type BoardCard = {
  id: string;
  slug: string;
  name: string;
  reference: string;
  status: ProjectStatus;
  client: string;
  owner: string | null;
  target: string | null;
  overdue: boolean;
  done: number;
  total: number;
  waitingOn: number;
  committed: string | null;
  /** Where the server says this project may go next. */
  allowed: ProjectStatus[];
  /** A proposal or agreement came back with changes to make. */
  changesAsked: boolean;
};

const BADGE: Record<string, string> = {
  neutral: '',
  live: forms.badgeLive,
  good: forms.badgeGood,
  warn: forms.badgeWarn,
  bad: forms.badgeBad,
};

type Notice = { tone: 'ok' | 'error'; text: string; href?: string };
type Confirm = { card: BoardCard; to: ProjectStatus; warnings: string[] };
type Choice = { card: BoardCard; lane: Lane; options: ProjectStatus[] };

/**
 * The project board.
 *
 * Dragging a card is a request, not a decision. It goes to the same
 * moveProject action as the buttons on the project page, with the same guards
 * and the same audit trail, and the card only stays where it was dropped if the
 * server agrees. A guard that warns asks first; a guard that blocks explains.
 */
export function Board({ cards, canMove = true }: { cards: BoardCard[]; canMove?: boolean }) {
  const router = useRouter();
  const [items, setItems] = useState(cards);
  const [source, setSource] = useState(cards);
  // Fresh cards from the server (after a move, the page refreshes) replace the
  // local copy. Done during render rather than in an effect, as React
  // recommends for state that follows a prop, and without remounting — which
  // would also throw away the "moved" message the person is reading.
  if (cards !== source) {
    setSource(cards);
    setItems(cards);
  }
  const [dragging, setDragging] = useState<BoardCard | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [confirmNote, setConfirmNote] = useState('');
  const [choice, setChoice] = useState<Choice | null>(null);
  const [pending, startTransition] = useTransition();

  const sensors = useSensors(
    // With a mouse, a few pixels of travel before it counts as a drag, so
    // clicking a card's name still just opens the project. On a touch screen,
    // press and hold: a quick swipe scrolls the lanes instead of grabbing.
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  function place(id: string, status: ProjectStatus) {
    setItems((current) => current.map((card) => (card.id === id ? { ...card, status } : card)));
  }

  function move(card: BoardCard, to: ProjectStatus, acknowledged: boolean, note = '') {
    place(card.id, to);
    setNotice(null);
    startTransition(async () => {
      const form = new FormData();
      form.set('projectId', card.id);
      form.set('to', to);
      form.set('expectedFrom', card.status);
      if (acknowledged) form.set('acknowledged', 'on');
      if (note) form.set('note', note);

      const result = await moveProject({ status: 'idle' }, form);

      if (result.status === 'done') {
        setNotice({ tone: 'ok', text: `${card.name} moved to ${STAFF_LABEL[to]}.` });
        router.refresh();
        return;
      }

      // Anything else leaves the card where it was.
      place(card.id, card.status);
      if (result.status === 'confirm') {
        setConfirm({ card, to, warnings: (result.guards ?? []).map((guard) => guard.message) });
      } else {
        setNotice({
          tone: 'error',
          text: result.message ?? 'That move did not go through.',
          href: `/projects/${card.slug}`,
        });
      }
    });
  }

  function onDragStart(event: DragStartEvent) {
    setDragging(items.find((card) => card.id === event.active.id) ?? null);
  }

  function onDragEnd(event: DragEndEvent) {
    setDragging(null);
    const card = items.find((item) => item.id === event.active.id);
    const lane = LANES.find((item) => item.key === event.over?.id);
    if (!card || !lane) return;

    // Every stage in this lane it can reach in one step. Dropped back in its
    // own lane, that is a move within the lane, like a proposal being sent.
    const options = lane.statuses.filter(
      (status) => status !== card.status && card.allowed.includes(status),
    );
    const home = lane.statuses.includes(card.status);
    if (options.length === 0) {
      if (home) return;
      const next = card.allowed.map((status) => STAFF_LABEL[status]).join(', ');
      setNotice({
        tone: 'error',
        text: `${card.name} can't go straight to ${lane.label}.${next ? ` Next it can go to: ${next}.` : ''}`,
      });
      return;
    }
    if (options.length === 1 && !home) {
      move(card, options[0]!, false);
      return;
    }
    setChoice({ card, lane, options });
  }

  return (
    <>
      {notice && (
        <div
          className={`${styles.notice} ${notice.tone === 'error' ? styles.noticeError : styles.noticeOk}`}
          role="status"
          aria-live="polite"
        >
          <span>
            {notice.text}
            {notice.href && (
              <>
                {' '}
                <Link href={notice.href} className={styles.noticeLink}>
                  Open the project
                </Link>
              </>
            )}
          </span>
          <button
            type="button"
            className={styles.noticeClose}
            onClick={() => setNotice(null)}
            aria-label="Dismiss"
          >
            <X size={15} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      )}

      <DndContext
        // A fixed id: dnd-kit otherwise numbers its accessibility ids with a
        // counter that differs between the server render and the browser.
        id="project-board"
        // A role that cannot move projects sees the board, but nothing drags.
        sensors={canMove ? sensors : []}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setDragging(null)}
        accessibility={{
          screenReaderInstructions: {
            draggable:
              'To move a project, press space to pick it up, use the arrow keys to choose a stage, then press space again to drop it, or escape to cancel.',
          },
        }}
      >
        <div className={styles.board} aria-busy={pending || undefined}>
          {LANES.map((lane) => (
            <LaneColumn
              key={lane.key}
              lane={lane}
              cards={items.filter((card) => laneOf(card.status)?.key === lane.key)}
              dragging={dragging}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={null}>
          {dragging ? <CardBody card={dragging} lifted /> : null}
        </DragOverlay>
      </DndContext>

      {choice && (
        <div className={styles.scrim} role="presentation" onClick={() => setChoice(null)}>
          <div
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="board-choice-title"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setChoice(null);
            }}
          >
            <h2 id="board-choice-title" className={styles.dialogTitle}>
              Move {choice.card.name} to which stage?
            </h2>
            <p className={styles.dialogText}>
              It is at {STAFF_LABEL[choice.card.status]} now.
            </p>
            <div className={styles.dialogActions}>
              <button type="button" className={`${forms.button} ${forms.quiet}`} onClick={() => setChoice(null)}>
                Cancel
              </button>
              {choice.options.map((status, index) => (
                <button
                  key={status}
                  type="button"
                  className={`${forms.button} ${index === 0 ? '' : forms.quiet}`}
                  autoFocus={index === 0}
                  onClick={() => {
                    const { card } = choice;
                    setChoice(null);
                    move(card, status, false);
                  }}
                >
                  {STAFF_LABEL[status]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <div className={styles.scrim} role="presentation" onClick={() => setConfirm(null)}>
          <div
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="board-confirm-title"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setConfirm(null);
            }}
          >
            <h2 id="board-confirm-title" className={styles.dialogTitle}>
              Move to {STAFF_LABEL[confirm.to]}?
            </h2>
            <p className={styles.dialogText}>Before {confirm.card.name} moves, note that:</p>
            <ul className={styles.dialogList}>
              {confirm.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
            <div className={forms.field}>
              <label className={forms.label} htmlFor="board-move-note">
                Note <span className={forms.optional}>(saved in the project history)</span>
              </label>
              <textarea
                id="board-move-note"
                className={`${forms.control} ${forms.textarea}`}
                maxLength={2000}
                value={confirmNote}
                onChange={(event) => setConfirmNote(event.target.value)}
                placeholder="Why you are going ahead"
              />
            </div>
            <div className={styles.dialogActions}>
              <button type="button" className={`${forms.button} ${forms.quiet}`} onClick={() => setConfirm(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={forms.button}
                autoFocus
                onClick={() => {
                  const { card, to } = confirm;
                  setConfirm(null);
                  move(card, to, true, confirmNote.trim());
                  setConfirmNote('');
                }}
              >
                Move anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function LaneColumn({
  lane,
  cards,
  dragging,
}: {
  lane: Lane;
  cards: BoardCard[];
  dragging: BoardCard | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: lane.key });

  // While a card is in the air, lanes it can reach light up and the rest fade,
  // so the rules are visible before the drop rather than explained after it.
  const home = dragging ? lane.statuses.includes(dragging.status) : false;
  const reachable = dragging ? home || targetIn(lane, dragging.allowed) !== null : false;

  return (
    <section
      ref={setNodeRef}
      className={[
        styles.lane,
        toneClass(lane.tone),
        dragging && !reachable ? styles.laneBlocked : '',
        dragging && reachable && !home ? styles.laneOpen : '',
        isOver && reachable && !home ? styles.laneOver : '',
      ].join(' ')}
      aria-label={`${lane.label}, ${cards.length} ${cards.length === 1 ? 'project' : 'projects'}`}
    >
      <header className={styles.laneHead}>
        <span className={styles.laneDot} aria-hidden="true" />
        <h2 className={styles.laneTitle}>{lane.label}</h2>
        <span className={styles.laneCount}>{cards.length}</span>
      </header>
      <div className={styles.laneBody}>
        {cards.length === 0 ? (
          <p className={styles.laneEmpty}>Nothing here</p>
        ) : (
          cards.map((card) => <DraggableCard key={card.id} card={card} />)
        )}
      </div>
    </section>
  );
}

function DraggableCard({ card }: { card: BoardCard }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: card.id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`${styles.cardWrap} ${isDragging ? styles.cardGhost : ''}`}
      aria-roledescription="draggable project"
    >
      <CardBody card={card} />
    </div>
  );
}

function CardBody({ card, lifted }: { card: BoardCard; lifted?: boolean }) {
  const percent = card.total > 0 ? Math.round((card.done / card.total) * 100) : 0;
  return (
    <article className={`${styles.card} ${lifted ? styles.cardLifted : ''}`}>
      <div className={styles.cardTop}>
        <span className={`${forms.badge} ${BADGE[STATUS_TONE[card.status]]}`}>
          {card.changesAsked ? 'Changes asked' : STAFF_LABEL[card.status]}
        </span>
        <span className={styles.ref}>{card.reference}</span>
      </div>

      <Link href={`/projects/${card.slug}`} className={styles.cardName} draggable={false}>
        {card.name}
      </Link>

      <p className={styles.client}>{card.client}</p>

      {card.total > 0 && (
        <div className={styles.progress}>
          <div className={styles.progressTrack} aria-hidden="true">
            <div className={styles.progressFill} style={{ width: `${percent}%` }} />
          </div>
          <span className={styles.progressText}>
            {card.done}/{card.total} tasks
          </span>
        </div>
      )}

      <div className={styles.cardFoot}>
        {card.target ? (
          <span className={`${styles.meta} ${card.overdue ? styles.metaLate : ''}`}>
            <CalendarDays size={14} strokeWidth={2} aria-hidden="true" />
            {card.overdue ? `Overdue · ${card.target}` : card.target}
          </span>
        ) : (
          <span className={styles.meta}>No date</span>
        )}
        {card.committed && <span className={styles.value}>{card.committed}</span>}
      </div>

      {card.waitingOn > 0 && (
        <span className={`${styles.meta} ${styles.metaWaiting}`}>
          <Clock size={14} strokeWidth={2} aria-hidden="true" />
          Waiting on {card.waitingOn} from client
        </span>
      )}
      <span className={styles.meta}>
        <UserRound size={14} strokeWidth={2} aria-hidden="true" />
        {card.owner ?? 'Nobody leading yet'}
      </span>
    </article>
  );
}
