import { redirect } from 'next/navigation';
import { AuthLayout } from '@/components/console/AuthLayout';
import { ContinueButton } from '@/components/console/ContinueButton';
import { CLIENT_LINKS } from '@/lib/console/client-links';
import { checkMagicToken } from '@/lib/console/magic-link';
import { continueWithLink } from './actions';
import auth from '@/styles/auth.module.css';

export const metadata = { title: 'Continue' };

/**
 * Where every link we send a client opens: invitations, setup links shared on
 * WhatsApp, sign-in links, contracts and invoices.
 *
 * Opening it changes nothing. WhatsApp, iMessage and mail scanners fetch a
 * link to build a preview before anyone taps it, and a link that was spent on
 * that fetch would be dead by the time the client opened it. So this page
 * only checks the link is still good and asks for one press; the press is
 * what uses it and signs them in. The page says nothing about whose link it
 * is, because a preview card would show it to whoever is in the chat.
 */
export default async function VerifyLink({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token: raw } = await searchParams;
  const token = typeof raw === 'string' ? raw : '';
  if (!token) redirect('/portal/sign-in?error=missing');

  const claim = await checkMagicToken(token, CLIENT_LINKS);
  if (!claim || claim.actorType !== 'client_contact') redirect('/portal/sign-in?error=expired');

  return (
    <AuthLayout role="Portal">
      <div className={auth.panel}>
        <h1 className={auth.heading}>Your project portal</h1>
        <div className={auth.card}>
          <form action={continueWithLink}>
            <input type="hidden" name="token" value={token} />
            <ContinueButton />
          </form>
        </div>
      </div>
    </AuthLayout>
  );
}
