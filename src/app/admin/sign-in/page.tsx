import { redirect } from 'next/navigation';
import { BrandMark } from '@/components/BrandMark';
import { getStaffActor } from '@/lib/console/auth';
import { SignInForm } from './SignInForm';
import styles from '../Admin.module.css';
import forms from '@/styles/forms.module.css';

export const metadata = { title: 'Sign in' };

export default async function AdminSignIn() {
  // Nobody needs to see a sign-in form while already signed in.
  if (await getStaffActor()) {
    redirect('/');
  }

  return (
    <main className={`${styles.page} ${styles.narrow}`}>
      <BrandMark className={styles.brandMark} title="Ubunifu Technologies" />
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <h1 className={styles.heading}>
            Sign in to the <span className={styles.headingAccent}>console</span>
          </h1>
          <p className={styles.lead}>
            Ubunifu staff only. This page is not served on ubunifutech.com.
          </p>
        </div>
      </div>
      <div className={forms.card}>
        <SignInForm />
      </div>
    </main>
  );
}
