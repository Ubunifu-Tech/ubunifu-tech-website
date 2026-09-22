import Link from 'next/link';
import { db } from '@/lib/db';
import { requireStaff } from '@/lib/console/auth';
import { NewClientForm } from './NewClientForm';
import styles from '../../Admin.module.css';

export const metadata = { title: 'New client · Ubunifu Console' };

/**
 * Manual onboarding.
 *
 * Most work does not arrive through the website form — it arrives as a call or
 * a conversation, and by the time anyone opens the console the engagement is
 * already real. This is the way in for that, without inventing an enquiry that
 * never happened.
 */
export default async function NewClientPage() {
  await requireStaff();

  const templates = await db.projectTemplate.findMany({
    orderBy: [{ serviceLine: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      serviceLine: true,
      description: true,
      isDefault: true,
    },
  });

  return (
    <main className={`${styles.panel} ${styles.wide}`}>
      <Link href="/clients" className={styles.backLink}>
        ← Clients
      </Link>
      <h1 className={styles.heading}>
        New <span className={styles.headingAccent}>client</span>
      </h1>
      <p className={styles.lead}>
        For work that came in by phone, WhatsApp or a conversation rather than through the
        website.
      </p>
      <NewClientForm templates={templates} />
    </main>
  );
}
