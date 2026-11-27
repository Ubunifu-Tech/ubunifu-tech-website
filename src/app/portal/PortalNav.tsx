'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Portal.module.css';

export type PortalCounts = { documents: number; invoices: number; requests: number };

const LINKS: { href: string; label: string; count?: keyof PortalCounts; exact?: boolean }[] = [
  { href: '/', label: 'Projects', exact: true },
  { href: '/documents', label: 'Documents', count: 'documents' },
  { href: '/invoices', label: 'Invoices', count: 'invoices' },
  { href: '/requests', label: 'Requests', count: 'requests' },
  { href: '/team', label: 'Team' },
];

/** The portal's sections. A number means something is waiting on you. */
export function PortalNav({ counts }: { counts: PortalCounts }) {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Your portal">
      {LINKS.map((link) => {
        const current = link.exact
          ? pathname === link.href || pathname.startsWith('/projects')
          : pathname.startsWith(link.href);
        const count = link.count ? counts[link.count] : 0;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={styles.navLink}
            aria-current={current ? 'page' : undefined}
          >
            {link.label}
            {count > 0 && (
              <span className={styles.navCount}>
                {count}
                <span className="srOnly"> waiting</span>
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
