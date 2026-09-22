import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { BrandMark } from '@/components/BrandMark';
import { getClientActor } from '@/lib/console/auth';
import styles from './Portal.module.css';

/**
 * The client portal shell.
 *
 * Sits outside the (site) group deliberately: a client opening a signing link
 * or an invoice should land in their portal, not in a marketing page with a
 * "Start a project" button. It is also not indexed — every page behind it is
 * somebody's private project.
 *
 * The bar comes from getClientActor rather than requireClient, because the
 * sign-in page lives under this layout too and must render for someone with no
 * session. It is chrome, not a gate; every page still authorises itself.
 */
export const metadata: Metadata = {
  title: { default: 'Your portal · Ubunifu', template: '%s · Ubunifu portal' },
  robots: { index: false, follow: false, nocache: true },
};

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const actor = await getClientActor();

  return (
    <div className={styles.shell}>
      <header className={styles.bar}>
        <div className={styles.barInner}>
          <Link href={actor ? '/portal' : '/'} className={styles.brand}>
            <BrandMark className={styles.brandMark} title="Ubunifu Technologies" />
            <span className={styles.brandText}>
              Ubunifu{' '}
              {actor ? (
                <span className={styles.org}>· {actor.clientName}</span>
              ) : (
                <span className={styles.org}>portal</span>
              )}
            </span>
          </Link>
          {actor && (
            <div className={styles.account}>
              <span>{actor.name}</span>
              {/* A plain form, so signing out does not depend on JavaScript —
                  and POST, so an image tag cannot trigger it. */}
              <form action="/portal/sign-out" method="post">
                <button type="submit" className={styles.signOut}>
                  Sign out
                </button>
              </form>
            </div>
          )}
        </div>
      </header>
      {children}
    </div>
  );
}
