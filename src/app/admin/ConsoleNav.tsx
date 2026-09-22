'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  Briefcase,
  Building2,
  Inbox,
  LayoutDashboard,
  Receipt,
  RefreshCw,
  Settings,
} from 'lucide-react';
import styles from './Admin.module.css';

/**
 * Console navigation.
 *
 * Hrefs carry no /admin prefix. The browser is on admin.ubunifutech.com/clients
 * — proxy.ts adds the prefix on the way in, so a link written with it would
 * 404. usePathname reports the same un-prefixed path, which is what makes the
 * comparison below work.
 */
export type NavCounts = {
  enquiries: number;
  projects: number;
  invoices: number;
  renewals: number;
};

const ICONS = {
  overview: LayoutDashboard,
  enquiries: Inbox,
  clients: Building2,
  projects: Briefcase,
  invoices: Receipt,
  renewals: RefreshCw,
  activity: Activity,
  settings: Settings,
} as const;

type Item = {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
  /** Which count to show, when it is greater than zero. */
  count?: keyof NavCounts;
  /** Quiet counts are information; loud ones mean somebody is waiting. */
  quiet?: boolean;
};

const GROUPS: { label?: string; items: Item[] }[] = [
  {
    items: [{ href: '/', label: 'Overview', icon: 'overview' }],
  },
  {
    label: 'Pipeline',
    items: [
      { href: '/enquiries', label: 'Enquiries', icon: 'enquiries', count: 'enquiries' },
      { href: '/clients', label: 'Clients', icon: 'clients' },
      { href: '/projects', label: 'Projects', icon: 'projects', count: 'projects', quiet: true },
    ],
  },
  {
    label: 'Money',
    items: [
      { href: '/invoices', label: 'Invoices', icon: 'invoices', count: 'invoices' },
      { href: '/renewals', label: 'Renewals', icon: 'renewals', count: 'renewals' },
    ],
  },
  {
    label: 'Record',
    items: [
      { href: '/activity', label: 'Activity', icon: 'activity' },
      { href: '/settings', label: 'Settings', icon: 'settings' },
    ],
  },
];

export function ConsoleNav({ counts }: { counts: NavCounts }) {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Console">
      {GROUPS.map((group, index) => (
        <React.Fragment key={group.label ?? index}>
          {group.label && <p className={styles.navGroupLabel}>{group.label}</p>}
          {group.items.map((item) => {
            const Icon = ICONS[item.icon];
            const current =
              item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            const count = item.count ? counts[item.count] : 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={styles.navLink}
                aria-current={current ? 'page' : undefined}
              >
                <Icon size={17} strokeWidth={1.8} className={styles.navIcon} aria-hidden="true" />
                <span className={styles.navText}>{item.label}</span>
                {count > 0 && (
                  <span
                    className={`${styles.navCount} ${item.quiet ? styles.navCountQuiet : ''}`}
                  >
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </Link>
            );
          })}
        </React.Fragment>
      ))}
    </nav>
  );
}
