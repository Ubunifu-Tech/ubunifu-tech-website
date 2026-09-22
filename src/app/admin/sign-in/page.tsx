import { redirect } from 'next/navigation';
import { getStaffActor } from '@/lib/console/auth';
import { SignInForm } from './SignInForm';
import styles from '../Admin.module.css';

export const metadata = { title: 'Sign in · Ubunifu Console' };

export default async function AdminSignIn() {
  // Nobody needs to see a sign-in form while already signed in.
  if (await getStaffActor()) {
    redirect('/');
  }

  return (
    <main className={styles.panel}>
      <h1 className={styles.heading}>
        Sign in to the <span className={styles.headingAccent}>console</span>
      </h1>
      <p className={styles.lead}>
        Ubunifu staff only. This page is not served on ubunifutech.com.
      </p>
      <SignInForm />
    </main>
  );
}
