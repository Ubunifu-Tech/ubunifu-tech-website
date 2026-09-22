import React from 'react';
import type { Metadata } from 'next';
import styles from './Admin.module.css';

/**
 * The console shell.
 *
 * Reached only as admin.ubunifutech.com/* — middleware rewrites that host into
 * /admin/* and 404s these paths everywhere else. The marketing layout is not
 * used here on purpose: no navbar, no footer, no ambient shader, and none of
 * the public site's client-side weight on a screen staff keep open all day.
 */
export const metadata: Metadata = {
  title: 'Ubunifu Console',
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className={styles.shell}>{children}</div>;
}
