'use client';

import { useActionState, useState } from 'react';
import { createSetupLink, type SetupLinkState } from '../actions';
import table from '@/styles/table.module.css';
import forms from '@/styles/forms.module.css';
import styles from '../../Admin.module.css';

const INITIAL: SetupLinkState = { status: 'idle' };

/**
 * Makes a one-time setup link for somebody who has not set up their account,
 * to send them by hand. The link is shown once, with a copy button and a
 * WhatsApp message already written.
 */
export function SetupLink({ contactId }: { contactId: string }) {
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
        <span className={table.actionGroup}>
          <button
            type="button"
            className={table.action}
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
            <a href={state.whatsapp} target="_blank" rel="noopener noreferrer" className={table.action}>
              Send on WhatsApp
            </a>
          )}
        </span>
        <span className={styles.setupHint}>Works once, for 14 days. Only send it to them.</span>
      </div>
    );
  }

  return (
    <form action={action} className={table.actionGroup}>
      <input type="hidden" name="contactId" value={contactId} />
      <button type="submit" className={table.action} disabled={pending}>
        {pending ? 'Making…' : 'Setup link'}
      </button>
      {state.status === 'error' && <span className={table.muted}>{state.message}</span>}
    </form>
  );
}
