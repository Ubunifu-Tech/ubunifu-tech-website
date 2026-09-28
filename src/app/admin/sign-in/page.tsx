import { redirect } from 'next/navigation';
import { getStaffActor } from '@/lib/console/auth';
import { safeConsolePath } from '@/lib/console/return-path';
import { AuthLayout } from '@/components/console/AuthLayout';
import { SignInForm } from './SignInForm';
import auth from '@/styles/auth.module.css';

export const metadata = { title: 'Sign in' };

/** Why a sign-in link, or a session that ended, sent someone here. */
const LINK_PROBLEM: Record<string, string> = {
  expired: 'That link has expired or was already used. Ask for a new one below.',
  missing: 'That link was incomplete. Ask for a new one below.',
  origin: 'Open the link in the browser you use for the console, then press Continue again.',
  'signed-out': 'You were signed out. Sign in again.',
  ended: 'Your access to the console has ended. Talk to an owner if you need it back.',
};

export default async function AdminSignIn({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next: nextRaw } = await searchParams;
  // The page they were on. It travels with the link they ask for, so signing
  // in takes them back to it.
  const next = safeConsolePath(nextRaw);

  // Nobody needs to see a sign-in form while already signed in.
  if (await getStaffActor()) {
    redirect(next ?? '/');
  }

  const problem =
    error === 'signed-out' && next
      ? 'You were signed out. Sign in again and you will go back to where you were.'
      : error
        ? LINK_PROBLEM[error]
        : next
          ? 'Sign in to go back to the page you were on.'
          : undefined;

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
          <SignInForm next={next} />
        </div>
      </div>
    </AuthLayout>
  );
}
