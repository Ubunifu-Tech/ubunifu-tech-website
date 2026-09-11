import React from 'react';
import Link from 'next/link';
import { site, cta } from '@/content/site';
import { AmbientShader } from './AmbientShader';
import styles from './CtaBand.module.css';

// Full-width closing call-to-action, kept separate from the footer.
export const CtaBand: React.FC = () => {
  return (
    <section className={styles.section}>
      <div className={styles.panel}>
        <AmbientShader placement="panel" />
        <div className={`container ${styles.content}`}>
          <div className={styles.statement}>
            <h2 className={styles.heading}>Have a project in mind?</h2>
          </div>
          <div className={styles.details}>
            <p className={styles.text}>
              Tell us what you need. We can discuss the scope, timing, and budget.
            </p>
            <div className={styles.actions}>
              <Link href={site.urls.contact} className={styles.btn}>
                {cta.primary}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
