import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { toneClass, type Tone } from './Tone';
import styles from '@/app/admin/Admin.module.css';

/**
 * One figure on a dashboard: what it is, the number, and a line of context.
 * With an href the whole card is the link to the list behind the number.
 */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'neutral',
  href,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon: LucideIcon;
  tone?: Tone;
  href?: string;
}) {
  const body = (
    <>
      <div className={styles.statTop}>
        <p className={styles.statLabel}>{label}</p>
        <span className={`${styles.statIcon} ${toneClass(tone)}`} aria-hidden="true">
          <Icon size={18} strokeWidth={2} />
        </span>
      </div>
      <p className={styles.statValue}>{value}</p>
      {hint && <p className={styles.statHint}>{hint}</p>}
    </>
  );

  return href ? (
    <Link href={href} className={`${styles.stat} ${styles.statLink}`}>
      {body}
    </Link>
  ) : (
    <div className={styles.stat}>{body}</div>
  );
}
