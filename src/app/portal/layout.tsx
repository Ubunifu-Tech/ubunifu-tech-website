import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { unstable_rethrow } from 'next/navigation';
import { BrandMark } from '@/components/BrandMark';
import { Assistant } from '@/components/Assistant';
import { ProfileMenu } from '@/components/console/ProfileMenu';
import { getClientActor } from '@/lib/console/auth';
import { db } from '@/lib/db';
import { awaitingSignature, liveInvoice, liveTicket } from '@/lib/console/live';
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

/** Entrance screens under /portal, which are always shown without the bar. */
const ENTRANCE = /^\/portal\/(sign-in|reset|link)(\/|\?|$)/;

/** What is waiting on the client, for the numbers beside each section. */
async function countsFor(clientId: string): Promise<PortalCounts> {
  try {
    const [documents, invoices, requests] = await Promise.all([
      db.document.count({
        where: { project: { clientId, deletedAt: null }, ...awaitingSignature(new Date()) },
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
    // Next's own signals (this page is dynamic, a redirect) are not failures.
    unstable_rethrow(error);
    console.error('[portal] could not read the session', error);
    return null;
  });

  /**
   * The entrances bring their own full-height layout and their own mark:
   * sign-in, Continue, setting up, choosing a new password and a link shared
   * by hand. Someone signed out or not set up yet only ever sees those, and a
   * signed-in client opening one gets it bare too. A bar above them would be
   * a second brand mark and an account menu on a screen already designed as
   * an entrance. The path comes from the proxy, which sets it on every portal
   * request, action posts included.
   *
   * A layout is not drawn again on a client-side navigation, so an entrance
   * links into the portal with a plain <a>, never <Link>: the full page load
   * is what brings the bar back. An action that redirects from an entrance
   * into the portal either sets the session cookie, which draws everything
   * again, or revalidates this layout first, as finishing setup does.
   */
  const path = (await headers()).get('x-portal-path') ?? '';
  if (!actor || !actor.isActivated || ENTRANCE.test(path)) return <>{children}</>;

  const counts = await countsFor(actor.clientId);

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
          <PortalNav counts={counts} />
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
      <Assistant variant="portal" />
    </div>
  );
}
