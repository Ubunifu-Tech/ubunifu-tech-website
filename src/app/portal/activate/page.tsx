import { redirect } from 'next/navigation';
import { getPendingContact } from '@/lib/console/auth';
import { safePortalPath } from '@/lib/console/return-path';
import { AuthLayout } from '@/components/console/AuthLayout';
import { ReachUs } from '@/components/console/ReachUs';
import { ActivateForm } from './ActivateForm';
import auth from '@/styles/auth.module.css';

export const metadata = { title: 'Set up your account' };

export default async function ActivatePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // Where the link they came from pointed, for once they have finished.
  const next = safePortalPath((await searchParams).next);
  const actor = await getPendingContact();
  // Reached only with a session from an invitation or a shared setup link.
  if (!actor) redirect('/portal/sign-in');
  if (actor.isActivated) redirect(next ?? '/portal');

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
          <ActivateForm
            defaultName={actor.name}
            email={actor.email}
            defaultPhone={actor.phone ?? ''}
            next={next}
          />
        </div>
        <ReachUs lead="Stuck?" className={auth.foot} />
      </div>
    </AuthLayout>
  );
}
