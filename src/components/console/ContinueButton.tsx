'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import forms from '@/styles/forms.module.css';

/**
 * The one button on the page a sign-in link opens on. Disabled while it is
 * working, because a second press would find the link already used.
 */
export function ContinueButton() {
  // useFormStatus follows a form posting to an action; `sent` covers one that
  // posts to a route, where the browser navigates away on its own.
  const { pending } = useFormStatus();
  const [sent, setSent] = useState(false);
  const busy = pending || sent;
  return (
    <button
      type="submit"
      className={forms.button}
      disabled={busy}
      // After the submit has gone: disabling it first would cancel it.
      onClick={() => setTimeout(() => setSent(true), 0)}
    >
      {busy ? 'Opening…' : 'Continue'}
    </button>
  );
}
