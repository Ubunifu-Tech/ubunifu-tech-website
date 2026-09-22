import { redirect } from 'next/navigation';
import { getClientActor } from '@/lib/console/auth';
import { AuthLayout } from '@/components/console/AuthLayout';
import { ActivateForm } from './ActivateForm';
import auth from '@/styles/auth.module.css';

export const metadata = { title: 'Set up your account' };

export default async function ActivatePage() {
  const actor = await getClientActor();
  // Reached only with a session from the invitation link.
  if (!actor) redirect('/portal/sign-in');
  if (actor.isActivated) redirect('/portal');

  return (
    <AuthLayout
      role="Portal"
      pitch="Welcome to"
      pitchAccent={actor.clientName}
      points={[
        'One password, and you are in whenever you like.',
        'No more digging through email for the latest version.',
        'Everything about your project in one place, for as long as you need it.',
      ]}
      foot="Ubunifu Technologies · Tanzania"
    >
      <div className={`${auth.panel} ${auth.wide}`}>
        <h1 className={auth.heading}>
          Set up your <span className={auth.headingAccent}>account</span>
        </h1>
        <p className={auth.lead}>
          This is the portal for {actor.clientName}. Choose a password and you can sign in any time
          without waiting for an email.
        </p>
        <div className={auth.card}>
          <ActivateForm defaultName={actor.name} />
        </div>
      </div>
    </AuthLayout>
  );
}
