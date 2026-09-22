'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Portal.module.css';

const LINKS = [
  { href: '/portal', label: 'Projects', exact: true },
  { href: '/portal/invoices', label: 'Invoices' },
];

/** Two sections, so the bar carries them rather than a menu. */
export function PortalNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Your portal">
      {LINKS.map((link) => {
        const current = link.exact
          ? pathname === link.href || pathname.startsWith('/portal/projects')
          : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={styles.navLink}
            aria-current={current ? 'page' : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
