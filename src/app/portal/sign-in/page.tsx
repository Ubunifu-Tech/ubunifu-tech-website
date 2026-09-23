import { redirect } from 'next/navigation';
import { getClientActor, getPendingContact } from '@/lib/console/auth';
import { AuthLayout } from '@/components/console/AuthLayout';
import { SignInForms } from './SignInForms';
import { safePortalPath } from '@/lib/console/return-path';
import auth from '@/styles/auth.module.css';

export const metadata = { title: 'Sign in' };

/**
 * The verify route sends people here with a reason when a link does not work.
 * Both reasons are deliberately vague about the account: they say what happened
 * to the link, never whether the address behind it exists.
 */
const LINK_PROBLEM: Record<string, string> = {
  expired:
    'That link has expired or was already used. Sign in below, or get a new link.',
  missing:
    'That link was incomplete. Sign in below, or get a new link.',
  'set-up': 'Your account is already set up. Sign in below.',
};

export default async function PortalSignIn({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next: nextRaw } = await searchParams;
  const next = safePortalPath(nextRaw);

  const actor = await getClientActor();
  if (actor) {
    redirect(actor.isActivated ? (next ?? '/portal') : '/portal/activate');
  }
  // Somebody part way through setting up from a shared link may have no email
  // yet, so this form is no use to them; their session can still finish it.
  const pending = await getPendingContact();
  if (pending && !pending.isActivated) redirect('/portal/activate');

  const problem = error ? LINK_PROBLEM[error] : undefined;

  return (
    <AuthLayout role="Portal">
      <div className={auth.panel}>
        <h1 className={auth.heading}>Sign in to your portal</h1>
        {problem ? (
          <p className={auth.notice} role="status">
            {problem}
          </p>
        ) : null}

        <div className={auth.card}>
          <SignInForms next={next} />
        </div>
        <p className={auth.foot}>
          No account yet? Email info@ubunifutech.com.
        </p>
      </div>
    </AuthLayout>
  );
}
