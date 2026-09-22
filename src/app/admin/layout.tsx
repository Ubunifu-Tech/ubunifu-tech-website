import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { BrandMark } from '@/components/BrandMark';
import { getStaffActor } from '@/lib/console/auth';
import { navCounts } from '@/lib/console/counts';
import { ConsoleNav } from './ConsoleNav';
import { SignOutButton } from './SignOutButton';
import styles from './Admin.module.css';

/**
 * The console shell.
 *
 * Reached only as admin.ubunifutech.com/* — proxy.ts rewrites that host into
 * /admin/* and 404s these paths everywhere else. The marketing layout is not
 * used here on purpose: no navbar, no footer, no ambient shader, and none of
 * the public site's client-side weight on a screen staff keep open all day.
 *
 * The sidebar is drawn from getStaffActor rather than requireStaff, because the
 * sign-in page lives under this layout too and must render for someone who has
 * no session. It is chrome, not a gate — every page still authorises itself.
 */
export const metadata: Metadata = {
  title: { default: 'Ubunifu Console', template: '%s · Ubunifu Console' },
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const staff = await getStaffActor();

  /**
   * Signed out means the sign-in screen, which brings its own full-height
   * layout. Wrapping it in a second shell would give it two backgrounds and
   * two min-heights, so the chrome steps out of the way entirely.
   */
  if (!staff) return <>{children}</>;

  const counts = await navCounts();

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.brand}>
          <BrandMark className={styles.brandMark} title="Ubunifu Technologies" />
          <span className={styles.brandText}>
            Ubunifu <span className={styles.brandRole}>Console</span>
          </span>
        </Link>

        <ConsoleNav counts={counts} />

        <div className={styles.sidebarFoot}>
          <p className={styles.who}>
            {staff.name}
            <span className={styles.whoRole}>{staff.email}</span>
          </p>
          <SignOutButton action="/sign-out" />
        </div>
      </aside>
      {children}
    </div>
  );
}
