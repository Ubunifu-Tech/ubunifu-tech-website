'use client';

import { useActionState, useState, type ReactNode } from 'react';
import {
  requestPasswordReset,
  requestPortalLink,
  signInWithPassword,
  type PortalSignInState,
} from './actions';
import forms from '@/styles/forms.module.css';
import auth from '@/styles/auth.module.css';

const INITIAL: PortalSignInState = { status: 'idle' };

type Mode = 'password' | 'link' | 'reset';

export function SignInForms({
  next,
  startWith = 'password',
}: {
  next?: string | null;
  startWith?: Mode;
}) {
  const [mode, setMode] = useState<Mode>(startWith);
  // One address across the three forms, so switching between them, or a
  // wrong password, keeps what was typed.
  const [email, setEmail] = useState('');
  // Switching form starts it fresh, so a link sent earlier does not stay
  // announced on the next one.
  const [attempt, setAttempt] = useState(0);
  const go = (to: Mode) => {
    setMode(to);
    setAttempt((n) => n + 1);
  };

  const emailField = (id: string, disabled: boolean) => (
    <div className={forms.field}>
      <label htmlFor={id} className={forms.label}>
        Email
      </label>
      <input
        id={id}
        name="email"
        type="email"
        autoComplete="email"
        autoFocus={!email}
        required
        disabled={disabled}
        className={forms.control}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
    </div>
  );

  if (mode === 'reset') {
    return (
      <LinkRequest
        key={`reset-${attempt}`}
        action={requestPasswordReset}
        next={null}
        field={emailField}
        fieldId="reset-email"
        button="Email me a reset link"
        back={{ label: 'Back to sign in', onClick: () => go('password') }}
      />
    );
  }

  if (mode === 'link') {
    return (
      <LinkRequest
        key={`link-${attempt}`}
        action={requestPortalLink}
        next={next}
        field={emailField}
        fieldId="link-email"
        button="Email me a sign-in link"
        back={{ label: 'Sign in with a password', onClick: () => go('password') }}
      />
    );
  }

  return (
    <PasswordForm
      key={`password-${attempt}`}
      next={next}
      field={emailField}
      onForgot={() => go('reset')}
      onLink={() => go('link')}
    />
  );
}

function PasswordForm({
  next,
  field,
  onForgot,
  onLink,
}: {
  next?: string | null;
  field: (id: string, disabled: boolean) => ReactNode;
  onForgot: () => void;
  onLink: () => void;
}) {
  const [state, action, pending] = useActionState(signInWithPassword, INITIAL);
  const [showing, setShowing] = useState(false);

  return (
    <form action={action} className={forms.form}>
      {next && <input type="hidden" name="next" value={next} />}
      {field('email', pending)}

      <div className={forms.field}>
        <div className={auth.labelRow}>
          <label htmlFor="password" className={forms.label}>
            Password
          </label>
          <button type="button" className={forms.link} onClick={onForgot}>
            Forgot password?
          </button>
        </div>
        <div className={auth.reveal}>
          <input
            id="password"
            name="password"
            type={showing ? 'text' : 'password'}
            autoComplete="current-password"
            required
            disabled={pending}
            className={forms.control}
          />
          <button
            type="button"
            className={auth.revealButton}
            onClick={() => setShowing((shown) => !shown)}
            aria-pressed={showing}
            aria-controls="password"
          >
            {showing ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      <button type="submit" className={forms.button} disabled={pending}>
        {pending ? 'Signing in…' : 'Sign in'}
      </button>

      <p className={forms.error} role="status" aria-live="polite">
        {state.status === 'error' ? state.message : ''}
      </p>

      <p className={auth.or}>or</p>

      <button type="button" className={`${forms.button} ${forms.quiet}`} onClick={onLink}>
        Email me a sign-in link
      </button>
    </form>
  );
}

function LinkRequest({
  action: request,
  next,
  field,
  fieldId,
  button,
  back,
}: {
  action: (previous: PortalSignInState, formData: FormData) => Promise<PortalSignInState>;
  next: string | null | undefined;
  field: (id: string, disabled: boolean) => ReactNode;
  fieldId: string;
  button: string;
  back: { label: string; onClick: () => void };
}) {
  const [state, action, pending] = useActionState(request, INITIAL);
  const sent = state.status === 'sent';

  return (
    <form action={action} className={forms.form}>
      {next && <input type="hidden" name="next" value={next} />}
      {field(fieldId, pending)}

      <button type="submit" className={forms.button} disabled={pending}>
        {pending ? 'Sending…' : sent ? 'Send again' : button}
      </button>

      <p className={state.status === 'error' ? forms.error : auth.status} role="status" aria-live="polite">
        {state.message}
      </p>

      <button type="button" className={`${forms.link} ${auth.textButton}`} onClick={back.onClick}>
        {back.label}
      </button>
    </form>
  );
}
