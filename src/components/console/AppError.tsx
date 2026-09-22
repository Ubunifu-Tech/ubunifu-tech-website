'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import forms from '@/styles/forms.module.css';
import styles from './AppError.module.css';

/** What the console and the portal show when something fails unexpectedly. */
export function AppError({
  error,
  reset,
  home,
  label,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  home: string;
  label: string;
}) {
  useEffect(() => {
    // The digest ties this screen to the server log line.
    console.error('[app] unhandled error', error.digest ?? '', error);
  }, [error]);

  return (
    <main className={styles.wrap}>
      <section className={`${forms.card} ${styles.card}`}>
        <h1 className={styles.title}>Something went wrong</h1>
        <p className={styles.text}>Please try again. If it keeps happening, let us know.</p>
        <div className={forms.actions}>
          <button type="button" className={forms.button} onClick={reset}>
            <RotateCcw size={15} strokeWidth={1.8} aria-hidden="true" />
            Try again
          </button>
          <Link href={home} className={`${forms.button} ${forms.quiet}`}>
            {label}
          </Link>
        </div>
      </section>
    </main>
  );
}
