import { redirect } from 'next/navigation';
import { getStaffActor } from '@/lib/console/auth';
import { AuthLayout } from '@/components/console/AuthLayout';
import { SignInForm } from './SignInForm';
import auth from '@/styles/auth.module.css';

export const metadata = { title: 'Sign in' };

export default async function AdminSignIn() {
  // Nobody needs to see a sign-in form while already signed in.
  if (await getStaffActor()) {
    redirect('/');
  }

  return (
    <AuthLayout role="Console">
      <div className={auth.panel}>
        <h1 className={auth.heading}>Sign in</h1>
        <div className={auth.card}>
          <SignInForm />
        </div>
      </div>
    </AuthLayout>
  );
}
