'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Admin.module.css';

/**
 * Console navigation.
 *
 * Hrefs carry no /admin prefix. The browser is on admin.ubunifutech.com/clients
 * — proxy.ts adds the prefix on the way in, so a link written with it would
 * 404. usePathname reports the same un-prefixed path, which is what makes the
 * comparison below work.
 */
const LINKS = [
  { href: '/', label: 'Overview' },
  { href: '/enquiries', label: 'Enquiries' },
  { href: '/clients', label: 'Clients' },
  { href: '/projects', label: 'Projects' },
];

export function ConsoleNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Console">
      {LINKS.map((link) => {
        const current =
          link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
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
