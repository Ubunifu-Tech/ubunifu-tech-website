import { redirect } from 'next/navigation';
import { getPendingContact } from '@/lib/console/auth';
import { AuthLayout } from '@/components/console/AuthLayout';
import { ActivateForm } from './ActivateForm';
import auth from '@/styles/auth.module.css';

export const metadata = { title: 'Set up your account' };

export default async function ActivatePage() {
  const actor = await getPendingContact();
  // Reached only with a session from an invitation or a shared setup link.
  if (!actor) redirect('/portal/sign-in');
  if (actor.isActivated) redirect('/portal');

  return (
    <AuthLayout role="Portal">
      <div className={`${auth.panel} ${auth.wide}`}>
        <h1 className={auth.heading}>Set up your account</h1>
        <p className={auth.lead}>
          {actor.email
            ? `Choose a password for the ${actor.clientName} portal.`
            : `Add your details and choose a password for the ${actor.clientName} portal.`}
        </p>
        <div className={auth.card}>
          <ActivateForm defaultName={actor.name} email={actor.email} defaultPhone={actor.phone ?? ''} />
        </div>
      </div>
    </AuthLayout>
  );
}
