import { redirect } from 'next/navigation';
import { getStaffActor } from '@/lib/console/auth';
import { AuthLayout } from '@/components/console/AuthLayout';
import { SignInForm } from './SignInForm';
import auth from '@/styles/auth.module.css';

export const metadata = { title: 'Sign in' };

export default async function AdminSignIn() {
  // Nobody needs to see a sign-in form while already signed in.
  if (await getStaffActor()) {
    redirect('/');
  }

  return (
    <AuthLayout
      role="Console"
      pitch="Every client, every project,"
      pitchAccent="one record."
      points={[
        'Enquiries land here before anyone is emailed, so an outage never loses a lead.',
        'Projects move through a state machine that records who decided what, and why.',
        'Every invoice, payment and receipt is numbered, and nothing is ever deleted.',
      ]}
      foot="Ubunifu Technologies · Tanzania"
    >
      <div className={auth.panel}>
        <h1 className={auth.heading}>
          Sign in to the <span className={auth.headingAccent}>console</span>
        </h1>
        <p className={auth.lead}>For the Ubunifu team.</p>
        <div className={auth.card}>
          <SignInForm />
        </div>
      </div>
    </AuthLayout>
  );
}
