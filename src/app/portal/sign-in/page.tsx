import { redirect } from 'next/navigation';
import { getClientActor } from '@/lib/console/auth';
import { SignInForms } from './SignInForms';
import styles from '../Portal.module.css';

export const metadata = { title: 'Sign in' };

/**
 * The verify route sends people here with a reason when a link does not work.
 * Both reasons are deliberately vague about the account: they say what happened
 * to the link, never whether the address behind it exists.
 */
const LINK_PROBLEM: Record<string, string> = {
  expired:
    'That sign-in link has already been used or has run out. Links work once, so reopening an older email will land you here. Sign in below, or send yourself a new one.',
  missing: 'That link was incomplete — it was probably cut short by an email app. Sign in below, or send yourself a new one.',
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
    <main className={`${styles.main} ${styles.narrow}`}>
      <h1 className={styles.heading}>
        Sign in to your <span className={styles.headingAccent}>portal</span>
      </h1>
      <p className={styles.lead}>
        Progress updates, documents to review, and your invoices.
      </p>
      {problem ? (
        <p className={styles.notice} role="status">
          {problem}
        </p>
      ) : null}
      <SignInForms />
    </main>
  );
}
