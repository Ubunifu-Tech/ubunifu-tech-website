import { redirect } from 'next/navigation';
import { getStaffActor } from '@/lib/console/auth';
import { AuthLayout } from '@/components/console/AuthLayout';
import { SignInForm } from './SignInForm';
import auth from '@/styles/auth.module.css';

export const metadata = { title: 'Sign in' };

/** Why a sign-in link sent someone here instead of signing them in. */
const LINK_PROBLEM: Record<string, string> = {
  expired: 'That link has expired or was already used. Ask for a new one below.',
  missing: 'That link was incomplete. Ask for a new one below.',
};

export default async function AdminSignIn({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // Nobody needs to see a sign-in form while already signed in.
  if (await getStaffActor()) {
    redirect('/');
  }

  const { error } = await searchParams;
  const problem = error ? LINK_PROBLEM[error] : undefined;

  return (
    <AuthLayout role="Console">
      <div className={auth.panel}>
        <h1 className={auth.heading}>Sign in</h1>
        {problem ? (
          <p className={auth.notice} role="status">
            {problem}
          </p>
        ) : null}
        <div className={auth.card}>
          <SignInForm />
        </div>
      </div>
    </AuthLayout>
  );
}
