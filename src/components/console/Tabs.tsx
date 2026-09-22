import Link from 'next/link';
import styles from './Tabs.module.css';

export type TabItem = { key: string; label: string; href: string; count?: number };

/** Sections of one record, one screen each, so a busy page is not one long scroll. */
export function Tabs({ tabs, current }: { tabs: TabItem[]; current: string }) {
  return (
    <nav className={styles.tabs} aria-label="Sections">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={styles.tab}
          aria-current={tab.key === current ? 'page' : undefined}
          scroll={false}
        >
          {tab.label}
          {tab.count !== undefined && tab.count > 0 && <span className={styles.count}>{tab.count}</span>}
        </Link>
      ))}
    </nav>
  );
}
