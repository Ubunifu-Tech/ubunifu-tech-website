'use client';

import { useActionState, useState } from 'react';
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
  const [copied, setCopied] = useState(false);

  if (state.status === 'done' && state.url) {
    return (
      <div className={styles.setupLink}>
        <input
          className={`${forms.control} ${styles.setupUrl}`}
          value={state.url}
          readOnly
          aria-label="Link to share"
          onFocus={(event) => event.currentTarget.select()}
        />
        <div className={forms.actions}>
          <button
            type="button"
            className={forms.button}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(state.url!);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
          {state.whatsapp && (
            <a
              href={state.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className={`${forms.button} ${forms.quiet}`}
            >
              Send on WhatsApp
            </a>
          )}
        </div>
        <p className={styles.setupHint}>
          Only send it to {state.name ?? 'them'}. It lasts 14 days, and making a new one stops this
          one.
        </p>
      </div>
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
