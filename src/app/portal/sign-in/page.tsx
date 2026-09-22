import { redirect } from 'next/navigation';
import { getClientActor } from '@/lib/console/auth';
import { AuthLayout } from '@/components/console/AuthLayout';
import { SignInForms } from './SignInForms';
import auth from '@/styles/auth.module.css';

export const metadata = { title: 'Sign in' };

/**
 * The verify route sends people here with a reason when a link does not work.
 * Both reasons are deliberately vague about the account: they say what happened
 * to the link, never whether the address behind it exists.
 */
const LINK_PROBLEM: Record<string, string> = {
  expired:
    'That sign-in link has already been used or has run out. Links work once, so reopening an older email will land you here. Sign in below, or send yourself a new one.',
  missing:
    'That link was incomplete — it was probably cut short by an email app. Sign in below, or send yourself a new one.',
};

export default async function PortalSignIn({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const actor = await getClientActor();
  if (actor) {
    redirect(actor.isActivated ? '/portal' : '/portal/activate');
  }

  const { error } = await searchParams;
  const problem = error ? LINK_PROBLEM[error] : undefined;

  return (
    <AuthLayout
      role="Portal"
      pitch="Your project,"
      pitchAccent="as it happens."
      points={[
        'See exactly where the work has got to, stage by stage.',
        'Find everything we still need from you, in one list.',
        'Your invoices and receipts, whenever you need them.',
      ]}
      foot="Ubunifu Technologies · Tanzania"
    >
      <div className={auth.panel}>
        <h1 className={auth.heading}>
          Sign in to your <span className={auth.headingAccent}>portal</span>
        </h1>
        <p className={auth.lead}>
          Progress updates, documents to review, and your invoices.
        </p>

        {problem ? (
          <p className={auth.notice} role="status">
            {problem}
          </p>
        ) : null}

        <div className={auth.card}>
          <SignInForms />
        </div>
        <p className={auth.foot}>
          Not sure you have an account? Email info@ubunifutech.com and we will set one up.
        </p>
      </div>
    </AuthLayout>
  );
}
