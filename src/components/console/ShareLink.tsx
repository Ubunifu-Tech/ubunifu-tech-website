'use client';

import { useActionState, useEffect, useRef, useState, type ReactNode } from 'react';
import forms from '@/styles/forms.module.css';
import styles from '@/app/admin/Admin.module.css';

export type ShareLinkState = {
  status: 'idle' | 'done' | 'error';
  message?: string;
  url?: string;
  whatsapp?: string;
  /** Who the link is for. */
  name?: string;
};

const INITIAL: ShareLinkState = { status: 'idle' };

/**
 * A link to send by hand, for someone who does not use email or the portal:
 * made on a press, shown once with a copy button and a WhatsApp message
 * already written. Making another one stops the last one working.
 */
export function ShareLink({
  action,
  hidden,
  label,
  intro,
}: {
  action: (previous: ShareLinkState, formData: FormData) => Promise<ShareLinkState>;
  hidden: Record<string, string>;
  /** The button, like "Share a link to sign". */
  label: string;
  /** One line on what the person can do with it. */
  intro: string;
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL);

  if (state.status === 'done' && state.url) {
    return (
      <LinkToSend
        url={state.url}
        whatsapp={state.whatsapp}
        fieldLabel="Link to share"
        hint={
          <>
            Only send it to {state.name ?? 'them'}. It lasts 14 days, and making a new one stops
            this one.
          </>
        }
      />
    );
  }

  return (
    <form action={formAction} className={forms.form}>
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <p className={styles.setupHint}>{intro}</p>
      <div className={forms.actions}>
        <button type="submit" className={`${forms.button} ${forms.quiet}`} disabled={pending}>
          {pending ? 'Making the link…' : label}
        </button>
      </div>
      {state.status === 'error' && (
        <p className={forms.error} role="status">
          {state.message}
        </p>
      )}
    </form>
  );
}

/**
 * The link once it is made: the address, Copy, and a WhatsApp message already
 * written. The status line stays mounted, empty until a copy, so a screen
 * reader hears 'Copied.' or the failure. When the clipboard refuses, the
 * field is selected so the link can be copied by hand.
 */
export function LinkToSend({
  url,
  whatsapp,
  fieldLabel,
  hint,
}: {
  url: string;
  whatsapp?: string;
  fieldLabel: string;
  hint: ReactNode;
}) {
  const [copy, setCopy] = useState<'idle' | 'copied' | 'failed'>('idle');
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (copy !== 'copied') return;
    const timer = setTimeout(() => setCopy('idle'), 4000);
    return () => clearTimeout(timer);
  }, [copy]);

  return (
    <div className={styles.setupLink}>
      <input
        ref={field}
        className={`${forms.control} ${styles.setupUrl}`}
        value={url}
        readOnly
        aria-label={fieldLabel}
        onFocus={(event) => event.currentTarget.select()}
      />
      <div className={forms.actions}>
        <button
          type="button"
          className={forms.button}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopy('copied');
            } catch {
              setCopy('failed');
              field.current?.focus();
              field.current?.select();
            }
          }}
        >
          Copy
        </button>
        {whatsapp && (
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className={`${forms.button} ${forms.quiet}`}
          >
            Send on WhatsApp
          </a>
        )}
      </div>
      <p className={styles.setupHint} role="status">
        {copy === 'copied' && 'Copied.'}
        {copy === 'failed' && 'Could not copy. Select the link above and copy it.'}
      </p>
      <p className={styles.setupHint}>{hint}</p>
    </div>
  );
}
