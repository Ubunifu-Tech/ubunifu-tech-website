'use client';

import { useActionState, useState } from 'react';
import { createSetupLink, type SetupLinkState } from '../actions';
import forms from '@/styles/forms.module.css';
import styles from '../../Admin.module.css';

const INITIAL: SetupLinkState = { status: 'idle' };

/**
 * Makes a one-time setup link for somebody who has not set up their account,
 * to send them by hand. The link is shown once, with a copy button and a
 * WhatsApp message already written. Lives in the person's row menu.
 */
export function SetupLink({ contactId, name }: { contactId: string; name: string }) {
  const [state, action, pending] = useActionState(createSetupLink, INITIAL);
  const [copied, setCopied] = useState(false);

  if (state.status === 'done' && state.url) {
    return (
      <div className={styles.setupLink}>
        <input
          className={`${forms.control} ${styles.setupUrl}`}
          value={state.url}
          readOnly
          aria-label="Setup link"
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
        <p className={styles.setupHint}>Works once, for 14 days. Only send it to {name}.</p>
      </div>
    );
  }

  return (
    <form action={action} className={styles.setupLink}>
      <input type="hidden" name="contactId" value={contactId} />
      <p className={styles.setupHint}>
        {name} opens it to set up their account and fill in anything missing, like their email. Any
        earlier link stops working.
      </p>
      <div className={forms.actions}>
        <button type="submit" className={forms.button} disabled={pending}>
          {pending ? 'Making…' : 'Make the link'}
        </button>
      </div>
      {state.status === 'error' && <p className={forms.error}>{state.message}</p>}
    </form>
  );
}
