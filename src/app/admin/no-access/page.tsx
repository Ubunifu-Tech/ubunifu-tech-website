import Link from 'next/link';
import { Lock } from 'lucide-react';
import { requireStaff } from '@/lib/console/auth';
import { PERMISSIONS } from '@/lib/console/permissions';
import { ROLE_LABEL } from '@/lib/console/people';
import styles from '../Admin.module.css';
import forms from '@/styles/forms.module.css';

export const metadata = { title: 'No access' };

/** Where a page sends someone whose role does not include it. */
export default async function NoAccess({ searchParams }: { searchParams: Promise<{ need?: string }> }) {
  const staff = await requireStaff();
  const { need } = await searchParams;
  const permission = PERMISSIONS.find((entry) => entry.key === need);

  return (
    <main className={`${styles.page} ${styles.medium}`}>
      <section className={`${forms.card} ${styles.noAccess}`}>
        <span className={styles.noAccessIcon} aria-hidden="true">
          <Lock size={20} strokeWidth={1.8} />
        </span>
        <h1 className={styles.heading}>
          {permission ? `${permission.label} is not part of your role` : 'This is not part of your role'}
        </h1>
        <p className={styles.lead}>
          {permission
            ? `This is for roles allowed to ${permission.description.charAt(0).toLowerCase()}${permission.description.slice(1)}`
            : 'This part of the console is not included in your role.'}{' '}
          You are {staff.role === 'admin' ? 'an admin' : `a ${ROLE_LABEL[staff.role].toLowerCase()}`}, and an
          owner can change what your role may do.
        </p>
        <div className={forms.actions}>
          <Link href="/" className={forms.button}>
            Back to the overview
          </Link>
          <Link href="/settings/team" className={`${forms.button} ${forms.quiet}`}>
            See who can help
          </Link>
        </div>
      </section>
    </main>
  );
}
