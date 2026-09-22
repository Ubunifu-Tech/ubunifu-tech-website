import styles from '../Admin.module.css';

/**
 * Placeholder. The magic-link request form replaces this; for now it exists so
 * requireStaff has somewhere to send an unauthenticated visitor, and so the
 * host rewrite is testable end to end.
 */
export default function AdminSignIn() {
  return (
    <main className={styles.panel}>
      <h1 className={styles.heading}>
        Sign in to the <span className={styles.headingAccent}>console</span>
      </h1>
      <p className={styles.lead}>
        Staff access is by emailed link. The form arrives with the next change.
      </p>
      <p className={styles.note}>
        This page is served only on the console host. It does not exist on
        ubunifutech.com.
      </p>
    </main>
  );
}
