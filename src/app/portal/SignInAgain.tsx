import forms from '@/styles/forms.module.css';

/**
 * The link shown with CLIENT_SIGNED_OUT. It opens the sign-in page in a new
 * tab, so what they typed stays in the form on this one, ready to send.
 */
export function SignInAgain() {
  return (
    <>
      {' '}
      <a href="/portal/sign-in" target="_blank" rel="noopener" className={forms.link}>
        Sign in
      </a>
    </>
  );
}
