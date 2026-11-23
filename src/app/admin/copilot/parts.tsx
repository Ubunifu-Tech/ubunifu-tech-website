'use client';

import Link from 'next/link';
import { ArrowUpRight, Briefcase, Building2, FileText, Receipt } from 'lucide-react';
import { ChatMarkdown } from '@/components/ChatMarkdown';
import styles from '../AssistantDock.module.css';

/**
 * What a Copilot thread is made of, drawn the same way in the panel beside a
 * page and on a chat's own page: what was said, the records it read, the
 * cards it showed, and its plans. These only draw what the server sent.
 */

export type StepView = { action: string; label: string; subject: string; details: string[]; sends?: string };
export type StepOutcome =
  | { state: 'done'; summary: string; href?: string }
  | { state: 'failed'; message: string }
  | { state: 'not_run' };
export type Plan = {
  id: string;
  status: 'pending' | 'running' | 'done' | 'stopped' | 'discarded' | 'superseded';
  summary: string;
  steps: StepView[];
  outcomes: StepOutcome[] | null;
};
export type Tone = 'good' | 'warn' | 'bad' | 'live' | 'neutral';
export type Card =
  | {
      kind: 'record';
      type: 'Client' | 'Project' | 'Document' | 'Invoice';
      title: string;
      subtitle?: string;
      badge?: { label: string; tone: Tone };
      facts: { label: string; value: string }[];
      href: string;
      actions: { label: string; href: string }[];
    }
  | { kind: 'table'; title: string; columns: string[]; rows: string[][]; numeric?: boolean; note?: string; href?: string };
export type ReadRef = { type: string; label: string; href: string };
export type Item =
  | { type: 'message'; id: string; role: 'user' | 'assistant'; content: string; cards?: Card[]; read?: ReadRef[] }
  | { type: 'plan'; plan: Plan }
  | { type: 'notice'; id: string; text: string; signIn?: boolean };

const TYPE_ICON = { Client: Building2, Project: Briefcase, Document: FileText, Invoice: Receipt } as const;

/** A record or a few rows, as the server read them. */
export function CardView({ card }: { card: Card }) {
  if (card.kind === 'table') {
    return (
      <section className={styles.card} aria-label={card.title}>
        <header className={styles.cardHead}>
          <h3 className={styles.cardTitle}>{card.title}</h3>
          {card.href && (
            <Link href={card.href} className={styles.cardOpen}>
              Open
              <ArrowUpRight size={14} aria-hidden />
            </Link>
          )}
        </header>
        {card.rows.length === 0 ? (
          <p className={styles.cardNote}>{card.note ?? 'Nothing to show.'}</p>
        ) : (
          <div className={styles.cardScroll}>
            <table className={styles.cardTable}>
              <thead>
                <tr>
                  {card.columns.map((column, index) => (
                    <th key={column} scope="col" data-numeric={card.numeric && index === card.columns.length - 1 ? '' : undefined}>
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {card.rows.map((row, at) => (
                  <tr key={at}>
                    {row.map((cell, index) =>
                      index === 0 ? (
                        <th key={index} scope="row">
                          {cell}
                        </th>
                      ) : (
                        <td key={index} data-numeric={card.numeric && index === row.length - 1 ? '' : undefined}>
                          {cell}
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  }

  const Icon = TYPE_ICON[card.type];
  return (
    <section className={styles.card} aria-label={`${card.type}: ${card.title}`}>
      <header className={styles.cardHead}>
        <span className={styles.cardKind}>
          <Icon size={14} aria-hidden />
          {card.type}
        </span>
        {card.badge && (
          <span className={styles.cardBadge} data-tone={card.badge.tone}>
            {card.badge.label}
          </span>
        )}
      </header>
      <div className={styles.cardBody}>
        <Link href={card.href} className={styles.cardName}>
          {card.title}
        </Link>
        {card.subtitle && <p className={styles.cardSub}>{card.subtitle}</p>}
        <dl className={styles.cardFacts}>
          {card.facts.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <footer className={styles.cardFoot}>
        {card.actions.map((action, index) => (
          <Link key={action.href + action.label} href={action.href} className={index === card.actions.length - 1 ? styles.confirm : styles.quiet}>
            {action.label}
          </Link>
        ))}
        {card.actions.length === 0 && (
          <Link href={card.href} className={styles.quiet}>
            Open
          </Link>
        )}
      </footer>
    </section>
  );
}

/** The records a reply went on, so it can be checked against them. */
export function ReadChips({ read }: { read: ReadRef[] }) {
  if (read.length === 0) return null;
  return (
    <p className={styles.read}>
      <span className={styles.readLabel}>Read</span>
      {read.map((ref) => (
        <Link key={ref.href} href={ref.href} className={styles.readChip} title={ref.type}>
          {ref.label}
        </Link>
      ))}
    </p>
  );
}

/** One reply: what it read, what it showed, what it said. */
export function Reply({ content, cards = [], read = [] }: { content: string; cards?: Card[]; read?: ReadRef[] }) {
  return (
    <div className={styles.turn}>
      {cards.map((card, index) => (
        <CardView key={index} card={card} />
      ))}
      <div className={styles.reply}>
        <ChatMarkdown text={content} variant="staff" />
      </div>
      <ReadChips read={read} />
    </div>
  );
}

const PLAN_STATE: Record<Plan['status'], string> = {
  pending: 'Waiting for you',
  running: 'In progress',
  done: 'Done',
  stopped: 'Stopped part way',
  discarded: 'Discarded',
  superseded: 'Replaced',
};

export function PlanTable({
  plan,
  busy,
  onConfirm,
  onDiscard,
  onChange,
}: {
  plan: Plan;
  busy?: boolean;
  /** Left out where the plan is only being read, such as a past chat. */
  onConfirm?: () => void;
  onDiscard?: () => void;
  onChange?: () => void;
}) {
  const pending = plan.status === 'pending';
  const sends = plan.steps.filter((step) => step.sends);

  return (
    <section className={styles.plan} data-status={plan.status} aria-label={plan.summary}>
      <header className={styles.planHead}>
        <h3 className={styles.planTitle}>{plan.summary}</h3>
        <span className={styles.planState} data-status={plan.status}>
          {PLAN_STATE[plan.status]}
        </span>
      </header>

      <table className={styles.steps}>
        <thead>
          <tr>
            <th scope="col" className={styles.num}>
              <span className="srOnly">Step</span>
            </th>
            <th scope="col">Step</th>
            <th scope="col">Details</th>
          </tr>
        </thead>
        <tbody>
          {plan.steps.map((step, index) => {
            const outcome = plan.outcomes?.[index];
            return (
              <tr key={index} data-outcome={outcome?.state}>
                <td className={styles.num}>{index + 1}</td>
                <th scope="row">
                  <span className={styles.stepLabel}>{step.label}</span>
                  <span className={styles.stepSubject}>{step.subject}</span>
                </th>
                <td>
                  <ul className={styles.details}>
                    {step.details.map((detail, at) => (
                      <li key={at}>{detail}</li>
                    ))}
                    {step.sends && pending && <li className={styles.sends}>{step.sends}</li>}
                  </ul>
                  {outcome?.state === 'done' && (
                    <p className={styles.done}>
                      {outcome.summary}
                      {outcome.href && (
                        <>
                          {'. '}
                          <Link href={outcome.href}>Open</Link>
                        </>
                      )}
                    </p>
                  )}
                  {outcome?.state === 'failed' && <p className={styles.failed}>{outcome.message}</p>}
                  {outcome?.state === 'not_run' && <p className={styles.skipped}>Not carried out</p>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {pending && !onConfirm && (
        <footer className={styles.planFoot}>
          <p className={styles.planNote}>Waiting to be confirmed, in the chat it belongs to.</p>
        </footer>
      )}
      {pending && onConfirm && (
        <footer className={styles.planFoot}>
          <p className={styles.planNote}>
            Nothing changes until you confirm.
            {sends.length > 0 && ` ${sends.length === 1 ? 'One step sends' : `${sends.length} steps send`} an email.`}
          </p>
          <div className={styles.planActions}>
            <button type="button" className={styles.quiet} onClick={onDiscard} disabled={busy}>
              Discard
            </button>
            <button type="button" className={styles.quiet} onClick={onChange} disabled={busy}>
              Change
            </button>
            <button type="button" className={styles.confirm} onClick={onConfirm} disabled={busy}>
              Confirm
            </button>
          </div>
        </footer>
      )}
    </section>
  );
}
