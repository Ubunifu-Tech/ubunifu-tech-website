import { redirect } from 'next/navigation';
import { AuthLayout } from '@/components/console/AuthLayout';
import { checkMagicToken } from '@/lib/console/magic-link';
import { ResetForm } from './ResetForm';
import auth from '@/styles/auth.module.css';

export const metadata = { title: 'Choose a new password' };

/**
 * Where a "choose a new password" link opens.
 *
 * Opening it changes nothing, for the same reason as the sign-in link page:
 * mail scanners and chat previews fetch a link before anyone taps it. The
 * link is only used up when the new password is saved. The page does not say
 * whose account it is.
 */
export default async function ResetPassword({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token: raw } = await searchParams;
  const token = typeof raw === 'string' ? raw : '';
  if (!token) redirect('/portal/sign-in?error=missing');

  const claim = await checkMagicToken(token, ['password_reset']);
  if (!claim || claim.actorType !== 'client_contact') {
    redirect('/portal/sign-in?error=reset-expired');
  }

  return (
    <AuthLayout role="Portal">
      <div className={auth.panel}>
        <h1 className={auth.heading}>Choose a new password</h1>
        <div className={auth.card}>
          <ResetForm token={token} />
        </div>
      </div>
    </AuthLayout>
  );
}
