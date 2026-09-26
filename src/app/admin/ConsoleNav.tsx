'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  BarChart3,
  Briefcase,
  Building2,
  Inbox,
  LayoutDashboard,
  FileText,
  LifeBuoy,
  Newspaper,
  Receipt,
  RefreshCw,
  Settings,
  Wallet,
} from 'lucide-react';
import type { Permission } from '@/lib/console/permissions';
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
  documents: number;
  requests: number;
};

const ICONS = {
  overview: LayoutDashboard,
  enquiries: Inbox,
  clients: Building2,
  projects: Briefcase,
  invoices: Receipt,
  renewals: RefreshCw,
  reports: BarChart3,
  costs: Wallet,
  documents: FileText,
  requests: LifeBuoy,
  posts: Newspaper,
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
  /** Shown only to roles that have this. */
  need?: Permission;
};

const GROUPS: { label?: string; items: Item[] }[] = [
  {
    items: [{ href: '/', label: 'Overview', icon: 'overview' }],
  },
  {
    label: 'Pipeline',
    items: [
      { href: '/enquiries', label: 'Enquiries', icon: 'enquiries', count: 'enquiries', need: 'enquiries' },
      { href: '/clients', label: 'Clients', icon: 'clients' },
      { href: '/projects', label: 'Projects', icon: 'projects', count: 'projects', quiet: true },
    ],
  },
  {
    label: 'Money',
    items: [
      { href: '/invoices', label: 'Invoices', icon: 'invoices', count: 'invoices', need: 'invoices' },
      { href: '/renewals', label: 'Renewals', icon: 'renewals', count: 'renewals', need: 'invoices' },
      { href: '/finance', label: 'Reports', icon: 'reports', need: 'finance' },
      { href: '/finance/costs', label: 'Costs', icon: 'costs', need: 'finance' },
    ],
  },
  {
    label: 'Client care',
    items: [
      {
        href: '/documents',
        label: 'Documents',
        icon: 'documents',
        count: 'documents',
        need: 'documents',
      },
      { href: '/requests', label: 'Requests', icon: 'requests', count: 'requests' },
    ],
  },
  {
    label: 'Website',
    items: [{ href: '/posts', label: 'Journal', icon: 'posts', need: 'journal' }],
  },
  {
    label: 'Record',
    items: [
      { href: '/activity', label: 'Activity', icon: 'activity' },
      { href: '/settings', label: 'Settings', icon: 'settings' },
    ],
  },
];

export function ConsoleNav({
  counts,
  permissions,
}: {
  counts: NavCounts;
  permissions: readonly Permission[];
}) {
  const pathname = usePathname();
  const groups = GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.need || permissions.includes(item.need)),
  })).filter((group) => group.items.length > 0);
  // The closest match is the current page: /finance/costs is Costs, not also
  // Reports at /finance.
  const matching = GROUPS.flatMap((group) => group.items)
    .filter((item) =>
      item.href === '/'
        ? pathname === '/'
        : pathname === item.href || pathname.startsWith(`${item.href}/`),
    )
    .sort((a, b) => b.href.length - a.href.length)[0];

  return (
    <nav className={styles.nav} aria-label="Console">
      {groups.map((group, index) => (
        <React.Fragment key={group.label ?? index}>
          {group.label && <p className={styles.navGroupLabel}>{group.label}</p>}
          {group.items.map((item) => {
            const Icon = ICONS[item.icon];
            const current = matching?.href === item.href;
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
