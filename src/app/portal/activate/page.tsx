import { redirect } from 'next/navigation';
import { getPendingContact } from '@/lib/console/auth';
import { SETUP_EMAIL_NOT_USABLE } from '@/lib/console/contacts';
import { safePortalPath } from '@/lib/console/return-path';
import { AuthLayout } from '@/components/console/AuthLayout';
import { ReachUs } from '@/components/console/ReachUs';
import { ActivateForm } from './ActivateForm';
import auth from '@/styles/auth.module.css';

export const metadata = { title: 'Set up your account' };

export default async function ActivatePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; email?: string }>;
}) {
  const query = await searchParams;
  // Where the link they came from pointed, for once they have finished.
  const next = safePortalPath(query.next);
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
            : `Add your details for the ${actor.clientName} portal. We will email you a link to confirm your address, then you choose a password.`}
        </p>
        {/* A confirmed address someone else took in the meantime. */}
        {!actor.email && query.email === 'taken' && (
          <p className={auth.notice} role="status">
            {SETUP_EMAIL_NOT_USABLE}
          </p>
        )}
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
