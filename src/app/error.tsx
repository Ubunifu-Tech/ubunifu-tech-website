'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { Topography } from '@/components/Topography';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { cta } from '@/content/site';
import styles from './NotFound.module.css';

/**
 * The last thing between a visitor and a stack trace.
 *
 * The blog reads its own failures and says so in place, and the contact form
 * and the assistant report their own outages — this is for everything nobody
 * thought of. It is a client component by requirement: React needs a boundary
 * it can re-render, which is also what makes "try again" possible rather than
 * just decorative.
 *
 * Borrows NotFound.module.css on purpose. A visitor who hits trouble twice on
 * the same site should meet the same room, not two different ones.
 */
export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The digest is what ties this screen to a line in the server log. The
    // visitor never needs it; we do, when they tell us what they saw.
    console.error('[site] unhandled error', error.digest ?? '', error);
  }, [error]);

  return (
    <>
      <Navbar />
      <main className={styles.main}>
        <div className={styles.backdrop} aria-hidden="true">
          <div className={styles.aurora} />
          <Topography className={styles.topo} />
        </div>

        <div className={`container ${styles.inner}`}>
          <p className={styles.code}>Sorry</p>
          <h1 className={styles.title}>Something on our side broke.</h1>
          <p className={styles.lead}>
            Not you, and not the link — it is ours to fix, and we can already see it. Trying again
            often works, because most of these are brief.
          </p>
          <div className={styles.actions}>
            <button type="button" onClick={reset} className={styles.btnPrimary}>
              Try again
            </button>
            <Link href="/" className={styles.btnSecondary}>
              Back home
            </Link>
            <Link href="/contact" className={styles.btnSecondary}>
              {cta.primary}
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
