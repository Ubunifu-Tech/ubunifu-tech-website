import Link from 'next/link';
import { requireStaff } from '@/lib/console/auth';
import { ROLE_DESCRIPTION, ROLE_LABEL } from '@/lib/console/people';
import { Avatar } from '@/components/console/Avatar';
import { ProfileForm } from '../settings/team/TeamControls';
import styles from '../Admin.module.css';
import forms from '@/styles/forms.module.css';

export const metadata = { title: 'Your profile' };

export default async function ProfilePage() {
  const staff = await requireStaff();

  return (
    <main className={`${styles.page} ${styles.medium}`}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <h1 className={styles.heading}>Your profile</h1>
          <p className={styles.lead}>How you appear to the team and on work you are given.</p>
        </div>
      </div>

      <section className={forms.card}>
        <div className={styles.profileHead}>
          <Avatar name={staff.name} size="lg" />
          <div>
            <p className={styles.profileName}>{staff.name}</p>
            <p className={styles.note}>{staff.email}</p>
          </div>
        </div>
        <ProfileForm name={staff.name} title={staff.title} />
      </section>

      <section className={forms.card}>
        <div className={forms.cardHeader}>
          <h2 className={forms.cardTitle}>Access</h2>
          <span className={`${forms.badge}`}>{ROLE_LABEL[staff.role]}</span>
        </div>
        <p className={styles.note}>
          {ROLE_DESCRIPTION[staff.role]} You sign in with a link sent to {staff.email}.{' '}
          <Link href="/settings/team" className={styles.inlineLink}>
            See the team
          </Link>
        </p>
      </section>
    </main>
  );
}
