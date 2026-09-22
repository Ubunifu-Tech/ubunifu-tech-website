import Link from 'next/link';
import { db } from '@/lib/db';
import { requireClient } from '@/lib/console/auth';
import { Avatar } from '@/components/console/Avatar';
import { DetailsForm, PasswordForm } from './ProfileForms';
import styles from '../Portal.module.css';
import forms from '@/styles/forms.module.css';

export const metadata = { title: 'Your profile' };

export default async function PortalProfile() {
  const actor = await requireClient();
  const me = await db.clientContact.findUnique({
    where: { id: actor.id },
    select: { name: true, email: true, role: true, phone: true, isPrimary: true, passwordHash: true },
  });
  if (!me) return null;

  return (
    <main className={`${styles.page} ${styles.medium}`}>
      <div className={styles.pageHead}>
        <h1 className={styles.heading}>Your profile</h1>
      </div>

      <section className={forms.card}>
        <div className={styles.profileHead}>
          <Avatar name={me.name} size="lg" />
          <div>
            <p className={styles.profileName}>{me.name}</p>
            <p className={styles.note}>
              {me.email}
              {me.isPrimary ? ` · Main contact for ${actor.clientName}` : ` · ${actor.clientName}`}
            </p>
          </div>
        </div>
        <DetailsForm name={me.name} role={me.role} phone={me.phone} />
      </section>

      {me.passwordHash && (
        <section className={forms.card}>
          <div className={forms.cardHeader}>
            <h2 className={forms.cardTitle}>Password</h2>
          </div>
          <PasswordForm />
        </section>
      )}

      <p className={`${styles.note} ${styles.after}`}>
        To change your email address, ask in Help or{' '}
        <Link href="/portal/requests" className={forms.link}>
          raise a request
        </Link>
        .
      </p>
    </main>
  );
}
