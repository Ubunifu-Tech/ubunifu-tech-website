import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { BrandMark } from '@/components/BrandMark';
import { Assistant } from '@/components/Assistant';
import { ProfileMenu } from '@/components/console/ProfileMenu';
import { getClientActor } from '@/lib/console/auth';
import { db } from '@/lib/db';
import { liveInvoice, liveTicket } from '@/lib/console/live';
import { PortalNav, type PortalCounts } from './PortalNav';
import styles from './Portal.module.css';

/**
 * The client portal shell.
 *
 * Sits outside the (site) group deliberately: a client opening a signing link
 * or an invoice should land in their portal, not in a marketing page with a
 * "Start a project" button. It is also not indexed; every page behind it is
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

/** What is waiting on the client, for the numbers beside each section. */
async function countsFor(clientId: string): Promise<PortalCounts> {
  try {
    const [documents, invoices, requests] = await Promise.all([
      db.document.count({
        where: { project: { clientId, deletedAt: null }, status: { in: ['sent', 'viewed'] } },
      }),
      db.invoice.count({
        where: { clientId, ...liveInvoice, status: { in: ['sent', 'overdue', 'part_paid'] } },
      }),
      db.ticket.count({ where: { clientId, ...liveTicket, status: 'waiting_on_client' } }),
    ]);
    return { documents, invoices, requests };
  } catch {
    // Numbers are a courtesy. The pages still load and say it themselves.
    return { documents: 0, invoices: 0, requests: 0 };
  }
}

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  // A database blip must not take the sign-in screen down with it.
  const actor = await getClientActor().catch((error: unknown) => {
    console.error('[portal] could not read the session', error);
    return null;
  });

  /**
   * Signed out means sign-in or the invitation link, and both bring their own
   * full-height layout. A bar above them would be chrome for an account that
   * does not exist yet, on top of a screen already designed as an entrance.
   */
  if (!actor) return <>{children}</>;

  const counts = actor.isActivated ? await countsFor(actor.clientId) : null;

  return (
    <div className={styles.shell}>
      <header className={styles.bar}>
        <div className={styles.barInner}>
          <Link href="/portal" className={styles.brand}>
            <BrandMark className={styles.brandMark} title="Ubunifu Technologies" />
            <span className={styles.brandText}>
              Ubunifu <span className={styles.org}>{actor.clientName}</span>
            </span>
          </Link>
          {counts && <PortalNav counts={counts} />}
          <div className={styles.account}>
            <ProfileMenu
              name={actor.name}
              email={actor.email}
              detail={actor.clientName}
              links={[
                { href: '/portal/profile', label: 'Your profile', icon: 'profile' },
                { href: '/portal/team', label: 'Your team', icon: 'team' },
              ]}
              signOutAction="/portal/sign-out"
            />
          </div>
        </div>
      </header>
      {children}
      {actor.isActivated && <Assistant variant="portal" />}
    </div>
  );
}
