import { AlertTriangle, Info, OctagonAlert, CheckCircle2 } from 'lucide-react';
import { toneClass } from './Tone';
import styles from './Callout.module.css';

const ICON = { warn: AlertTriangle, bad: OctagonAlert, info: Info, good: CheckCircle2 } as const;
const TONE = { warn: 'amber', bad: 'red', info: 'blue', good: 'green' } as const;

/**
 * A message set apart from the content around it: something missing, something
 * blocked, something to know before acting. One look everywhere, with room
 * above and below so it never sits flush against the next card.
 */
export function Callout({
  kind = 'warn',
  title,
  items,
  children,
  action,
}: {
  kind?: keyof typeof ICON;
  title?: string;
  /** Several separate points. One point is better as children. */
  items?: React.ReactNode[];
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  const Icon = ICON[kind];
  return (
    <div className={`${styles.callout} ${toneClass(TONE[kind])}`} role={kind === 'bad' ? 'alert' : 'note'}>
      <Icon size={18} strokeWidth={2} className={styles.icon} aria-hidden="true" />
      <div className={styles.body}>
        {title && <p className={styles.title}>{title}</p>}
        {children && <div className={styles.text}>{children}</div>}
        {items && items.length > 0 && (
          <ul className={styles.list}>
            {items.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        )}
        {action && <div className={styles.action}>{action}</div>}
      </div>
    </div>
  );
}
