'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import forms from '@/styles/forms.module.css';

/**
 * Makes a past chat the open one and opens Copilot on it. The chat that was
 * open is closed and kept, like any other.
 */
export function CarryOn({ chatId }: { chatId: string }) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'busy' | 'failed'>('idle');
  return (
    <>
      <button
        type="button"
        className={forms.button}
        disabled={state === 'busy'}
        onClick={async () => {
          setState('busy');
          try {
            const response = await fetch('/assistant', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ resume: chatId }),
            });
            if (!response.ok) throw new Error('refused');
            // It is the open chat now, so Copilot opens on it.
            router.push('/copilot');
          } catch {
            setState('failed');
          }
        }}
      >
        {state === 'busy' ? 'Opening…' : 'Carry on this chat'}
      </button>
      {state === 'failed' && (
        <p className={forms.error} role="alert">
          That chat could not be opened. Reload and try again.
        </p>
      )}
    </>
  );
}
