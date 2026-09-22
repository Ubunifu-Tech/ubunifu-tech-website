import Link from 'next/link';
import { Check } from 'lucide-react';
import styles from './Steps.module.css';

export type Step = { key: string; label: string };

/**
 * Where you are in a multi-step task. The number is the order of the steps,
 * which is the one thing it is for. Steps already done can be revisited:
 * with hrefFor they are links, with onSelect they are buttons.
 */
export function Steps({
  steps,
  current,
  hrefFor,
  onSelect,
  reachable,
  complete,
}: {
  steps: Step[];
  current: number;
  hrefFor?: (index: number) => string;
  onSelect?: (index: number) => void;
  /** The furthest step that may be opened. Defaults to the current one. */
  reachable?: number;
  /**
   * Which steps are finished, when that is known rather than implied by
   * order. Without it, every step before the current one counts as done.
   */
  complete?: boolean[];
}) {
  const furthest = reachable ?? current;
  return (
    <nav aria-label="Progress" className={styles.steps}>
      <ol className={styles.list}>
        {steps.map((step, index) => {
          const done = complete ? complete[index] === true : index < current;
          const state = index === current ? 'current' : done ? 'done' : 'upcoming';
          const open = index <= furthest && index !== current;
          const inner = (
            <>
              <span className={styles.marker} aria-hidden="true">
                {state === 'done' ? <Check size={14} strokeWidth={2.5} /> : index + 1}
              </span>
              <span className={styles.label}>{step.label}</span>
            </>
          );
          return (
            <li key={step.key} className={`${styles.step} ${styles[state]}`}>
              {open && hrefFor ? (
                <Link href={hrefFor(index)} className={styles.target}>
                  {inner}
                </Link>
              ) : open && onSelect ? (
                <button type="button" className={styles.target} onClick={() => onSelect(index)}>
                  {inner}
                </button>
              ) : (
                <span className={styles.target} aria-current={state === 'current' ? 'step' : undefined}>
                  {inner}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
