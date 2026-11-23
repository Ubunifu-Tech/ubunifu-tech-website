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
export function ActivityFeed({
  items,
  now,
  first,
}: {
  items: ActivityItem[];
  now: Date;
  /**
   * How many of the newest lines to show outright. The earlier ones wait
   * behind "Show earlier", in a box that scrolls. Left out, every line shows.
   */
  first?: number;
}) {
  if (items.length === 0) {
    return <p className={styles.note}>Nothing recorded yet.</p>;
  }

  // One or two left over are shown rather than hidden behind a button.
  const cut = first !== undefined && items.length > first + 2 ? first : items.length;
  const earlier = items.slice(cut);
  const list = (rows: ActivityItem[]) => (
    <ul className={styles.timeline}>
      {rows.map((item) => (
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

  return (
    <>
      {list(items.slice(0, cut))}
      {earlier.length > 0 && (
        <details className={styles.timelineMore}>
          <summary>Show {earlier.length} earlier</summary>
          <div className={styles.timelineScroll}>{list(earlier)}</div>
        </details>
      )}
    </>
  );
}
