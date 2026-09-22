import { redirect } from 'next/navigation';
import { getClientActor } from '@/lib/console/auth';
import { ActivateForm } from './ActivateForm';
import styles from '../Portal.module.css';
import forms from '@/styles/forms.module.css';

export const metadata = { title: 'Set up your account' };

export default async function ActivatePage() {
  const actor = await getClientActor();
  // Reached only with a session from the invitation link.
  if (!actor) redirect('/portal/sign-in');
  if (actor.isActivated) redirect('/portal');

  return (
    <main className={`${styles.page} ${styles.medium}`}>
      <div className={styles.pageHead}>
        <h1 className={styles.heading}>
          Set up your <span className={styles.headingAccent}>account</span>
        </h1>
        <p className={styles.lead}>
          This is the portal for {actor.clientName}. Choose a password and you can sign in any time
          without waiting for an email.
        </p>
      </div>
      <div className={forms.card}>
        <ActivateForm defaultName={actor.name} />
      </div>
    </main>
  );
}
