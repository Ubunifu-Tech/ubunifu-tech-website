import Link from 'next/link';
import styles from './Admin.module.css';
import forms from '@/styles/forms.module.css';

export const metadata = { title: { absolute: 'Not found · Ubunifu Console' } };

/**
 * A 404 that stays inside the console.
 *
 * Also the response for a staff member without the role a page needs, and for
 * anything requested on the wrong host — so it deliberately says only that the
 * page was not found, never that it exists but is out of reach.
 */
export default function AdminNotFound() {
  return (
    <main className={`${styles.page} ${styles.medium}`}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <h1 className={styles.heading}>
            Not <span className={styles.headingAccent}>found</span>
          </h1>
          <p className={styles.lead}>
            That page does not exist here. If you followed a link from somewhere in the console, it
            is worth saying so.
          </p>
        </div>
      </div>
      <Link href="/" className={forms.button}>
        Back to the console
      </Link>
    </main>
  );
}
