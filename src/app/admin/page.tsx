import Link from 'next/link';
import { requireStaff } from '@/lib/console/auth';
import styles from './Admin.module.css';

/**
 * Placeholder home. Its job today is to prove the guard: reaching it at all
 * means the host was right, the session was valid, and the address is still on
 * the staff allowlist.
 */
export default async function AdminHome() {
  const staff = await requireStaff();

  return (
    <main className={styles.panel}>
      <h1 className={styles.heading}>
        Ubunifu <span className={styles.headingAccent}>Console</span>
      </h1>
      <p className={styles.lead}>Signed in as {staff.name}.</p>
      <div className={styles.status}>
        <div className={styles.statusRow}>
          <span className={styles.statusLabel}>Email</span>
          <span>{staff.email}</span>
        </div>
        <div className={styles.statusRow}>
          <span className={styles.statusLabel}>Role</span>
          <span>{staff.role}</span>
        </div>
      </div>
      <p className={styles.actions}>
        <Link href="/clients" className={styles.button}>
          Clients
        </Link>
        <span className={styles.payoff}>Add a client, and send their portal invitation.</span>
      </p>
      <p className={styles.note}>
        Projects, billing and the CMS land here next.
      </p>
    </main>
  );
}
