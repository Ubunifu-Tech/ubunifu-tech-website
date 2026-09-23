'use client';

import { useFormStatus } from 'react-dom';
import forms from '@/styles/forms.module.css';

/**
 * The one button on the page a sign-in link opens on. Disabled while it is
 * working, because a second press would find the link already used.
 */
export function ContinueButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={forms.button} disabled={pending}>
      {pending ? 'Opening…' : 'Continue'}
    </button>
  );
}
