import Link from 'next/link';
import styles from './Figures.module.css';

export type Figure = {
  label: string;
  value: React.ReactNode;
  /** What the number means right now: a comparison, a due date, a split. */
  note?: React.ReactNode;
  /**
   * Colour only for something that needs acting on. Most figures have none,
   * which is what lets the ones that do stand out.
   */
  tone?: 'bad' | 'warn' | 'good';
  href?: string;
};

/**
 * The few numbers that say how things stand, read as one row. Figures that
 * link open the list behind them.
 */
export function Figures({ items, label }: { items: Figure[]; label?: string }) {
  return (
    <section className={styles.band} aria-label={label ?? 'At a glance'}>
      {items.map((item) => {
        const body = (
          <>
            <span className={styles.label}>{item.label}</span>
            <span className={`${styles.value} ${item.tone === 'bad' ? styles.valueBad : ''}`}>
              {item.value}
            </span>
            {item.note && (
              <span className={`${styles.note} ${item.tone ? styles[item.tone] : ''}`}>
                {item.note}
              </span>
            )}
          </>
        );
        return item.href ? (
          <Link key={item.label} href={item.href} className={`${styles.figure} ${styles.link}`}>
            {body}
          </Link>
        ) : (
          <div key={item.label} className={styles.figure}>
            {body}
          </div>
        );
      })}
    </section>
  );
}
