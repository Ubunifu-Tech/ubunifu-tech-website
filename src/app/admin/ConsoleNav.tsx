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
  FileText,
  LifeBuoy,
  Newspaper,
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
  /** Invoices past their due date, and renewal periods due to be invoiced. */
  money: number;
  documents: number;
  requests: number;
};

const ICONS = {
  home: LayoutDashboard,
  enquiries: Inbox,
  clients: Building2,
  projects: Briefcase,
  money: Wallet,
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
  /** Shown only to roles that have one of these. */
  need?: Permission[];
  /** Open to everyone, but the badge only for those whose job it is. */
  countNeed?: Permission;
  /** Other addresses that belong to this item, such as one receipt under Money. */
  also?: string[];
};

const MONEY_PAGES = ['/invoices', '/payments', '/receipts', '/refunds', '/renewals', '/finance'];

function items(permissions: readonly Permission[]): { main: Item[]; record: Item[] } {
  // Money opens on invoices, or on the reports for a role that sees the books
  // but not the invoices.
  const moneyHref = permissions.includes('invoices') ? '/invoices' : '/finance';
  return {
    main: [
      { href: '/', label: 'Home', icon: 'home' },
      { href: '/enquiries', label: 'Enquiries', icon: 'enquiries', count: 'enquiries', need: ['enquiries'] },
      { href: '/clients', label: 'Clients', icon: 'clients' },
      { href: '/projects', label: 'Projects', icon: 'projects' },
      {
        href: moneyHref,
        label: 'Money',
        icon: 'money',
        count: 'money',
        countNeed: 'invoices',
        need: ['invoices', 'finance'],
        also: MONEY_PAGES,
      },
      { href: '/documents', label: 'Documents', icon: 'documents', count: 'documents', need: ['documents'] },
      { href: '/requests', label: 'Requests', icon: 'requests', count: 'requests', countNeed: 'requests' },
      { href: '/posts', label: 'Journal', icon: 'posts', need: ['journal'] },
    ],
    record: [
      { href: '/activity', label: 'Activity', icon: 'activity' },
      { href: '/settings/team', label: 'Settings', icon: 'settings', also: ['/settings'] },
    ],
  };
}

export function ConsoleNav({
  counts,
  permissions,
}: {
  counts: NavCounts;
  permissions: readonly Permission[];
}) {
  const pathname = usePathname();
  const allowed = (item: Item) => !item.need || item.need.some((need) => permissions.includes(need));
  const { main, record } = items(permissions);
  const groups = [main.filter(allowed), record.filter(allowed)];
  const under = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const matching = [...main, ...record]
    .filter((item) =>
      item.href === '/' ? pathname === '/' : under(item.href) || (item.also ?? []).some(under),
    )
    .sort((a, b) => b.href.length - a.href.length)[0];

  return (
    <nav className={styles.nav} aria-label="Console">
      {groups.map((group, index) => (
        <div key={index} className={index > 0 ? styles.navRecord : styles.navMain}>
          {group.map((item) => {
            const Icon = ICONS[item.icon];
            const current = matching?.href === item.href;
            const count =
              item.count && (!item.countNeed || permissions.includes(item.countNeed))
                ? counts[item.count]
                : 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={styles.navLink}
                aria-current={current ? 'page' : undefined}
              >
                <Icon size={17} strokeWidth={1.8} className={styles.navIcon} aria-hidden="true" />
                <span className={styles.navText}>{item.label}</span>
                {count > 0 && <span className={styles.navCount}>{count > 99 ? '99+' : count}</span>}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
