import type { ActivityItem } from '@/lib/console/activity';
import { formatRelative } from '@/lib/console/money';
import styles from '@/app/admin/Admin.module.css';

const TONE_CLASS: Record<string, string> = {
  neutral: '',
  good: styles.eventOk,
  bad: styles.eventBad,
  live: styles.eventLive,
};

/**
 * The record, as one stream.
 *
 * A failed email sits in the same list as the action that meant to send it, so
 * "the client says they never got the link" is answered by scrolling rather
 * than by opening a provider's dashboard.
 */
export function ActivityFeed({ items, now }: { items: ActivityItem[]; now: Date }) {
  if (items.length === 0) {
    return <p className={styles.note}>Nothing recorded yet.</p>;
  }

  return (
    <ul className={styles.timeline}>
      {items.map((item) => (
        <li key={item.id} className={`${styles.event} ${TONE_CLASS[item.tone]}`}>
          <p className={styles.eventText}>{item.text}</p>
          <p className={styles.eventMeta}>
            {formatRelative(item.at, now)} · {item.meta}
          </p>
          {item.note && <p className={styles.eventNote}>{item.note}</p>}
        </li>
      ))}
    </ul>
  );
}
