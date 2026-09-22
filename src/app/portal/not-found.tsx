import Link from 'next/link';
import styles from './Portal.module.css';
import forms from '@/styles/forms.module.css';

export const metadata = { title: { absolute: 'Not found · Ubunifu portal' } };

/**
 * A 404 that stays inside the portal.
 *
 * Without this the root not-found renders, which carries the marketing navbar
 * — so a signed-in client who mistypes a URL is handed "Start a project" and a
 * services menu instead of a way back to their own work.
 *
 * It is also what a client sees when they follow a link to a project that is
 * not theirs, so it says nothing about whether that project exists.
 */
export default function PortalNotFound() {
  return (
    <main className={`${styles.page} ${styles.medium}`}>
      <div className={styles.pageHead}>
        <h1 className={styles.heading}>
          We could not <span className={styles.headingAccent}>find that</span>
        </h1>
        <p className={styles.lead}>
          The link may be old, or it may point at something that is not part of your account.
        </p>
      </div>
      <Link href="/portal" className={forms.button}>
        Back to your projects
      </Link>
    </main>
  );
}
