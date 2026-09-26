import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { unstable_rethrow } from 'next/navigation';
import { BrandMark } from '@/components/BrandMark';
import { getStaffActor } from '@/lib/console/auth';
import { navCounts } from '@/lib/console/counts';
import { ConsoleNav } from './ConsoleNav';
import { ProfileMenu, type ProfileLink } from '@/components/console/ProfileMenu';
import { ROLE_LABEL } from '@/lib/console/people';
import { MobileNav } from './MobileNav';
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
  // If the database cannot be reached, the chrome steps aside rather than
  // taking the page down with it: the sign-in screen still loads, and any
  // other page reports the problem through its own error screen.
  const staff = await getStaffActor().catch((error: unknown) => {
    // Next's own signals (this page is dynamic, a redirect) are not failures.
    unstable_rethrow(error);
    console.error('[console] could not read the session', error);
    return null;
  });

  /**
   * Signed out means the sign-in screen, which brings its own full-height
   * layout. Wrapping it in a second shell would give it two backgrounds and
   * two min-heights, so the chrome steps out of the way entirely.
   */
  if (!staff) return <>{children}</>;

  const counts = await navCounts().catch(() => ({
    enquiries: 0,
    projects: 0,
    invoices: 0,
    renewals: 0,
    documents: 0,
    requests: 0,
  }));

  const links: ProfileLink[] = [
    { href: '/profile', label: 'Your profile', icon: 'profile' },
    { href: '/settings/team', label: 'Team', icon: 'team' },
    { href: '/settings', label: 'Settings', icon: 'settings' },
  ];

  return (
    <div className={styles.shell}>
      {/* One band across the top: where you are, and who you are signed in as. */}
      <header className={styles.band}>
        <div className={styles.bandStart}>
          <MobileNav counts={counts} permissions={staff.permissions} />
          <Link href="/" className={styles.brand}>
            <BrandMark className={styles.brandMark} title="Ubunifu Technologies" />
            <span className={styles.brandText}>
              Ubunifu <span className={styles.brandRole}>Console</span>
            </span>
          </Link>
        </div>
        <div className={styles.bandEnd}>
          <ProfileMenu
            name={staff.name}
            email={staff.email}
            detail={staff.title ?? ROLE_LABEL[staff.role]}
            links={links}
            signOutAction="/sign-out"
          />
        </div>
      </header>

      <aside className={styles.sidebar} aria-label="Console">
        <ConsoleNav counts={counts} permissions={staff.permissions} />
      </aside>

      <div className={styles.work}>{children}</div>
    </div>
  );
}
