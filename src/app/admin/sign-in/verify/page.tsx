import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { AuthLayout } from '@/components/console/AuthLayout';
import { ContinueButton } from '@/components/console/ContinueButton';
import { isAdminHost } from '@/lib/console/env';
import { checkMagicToken } from '@/lib/console/magic-link';
import { continueStaffLink } from './actions';
import auth from '@/styles/auth.module.css';

export const metadata = { title: 'Continue' };

/**
 * Where a staff sign-in or invitation link opens. Opening it changes nothing,
 * so a mail scanner or a link preview that fetches it first cannot use it up;
 * the Continue button is what signs the person in.
 */
export default async function StaffVerifyLink({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  if (!isAdminHost((await headers()).get('host'))) notFound();

  const { token: raw } = await searchParams;
  const token = typeof raw === 'string' ? raw : '';
  if (!token) redirect('/sign-in?error=missing');

  const claim = await checkMagicToken(token, ['sign_in', 'invite']);
  if (!claim || claim.actorType !== 'staff') redirect('/sign-in?error=expired');

  return (
    <AuthLayout role="Console">
      <div className={auth.panel}>
        <h1 className={auth.heading}>Sign in</h1>
        <div className={auth.card}>
          <form action={continueStaffLink}>
            <input type="hidden" name="token" value={token} />
            <ContinueButton />
          </form>
        </div>
      </div>
    </AuthLayout>
  );
}
