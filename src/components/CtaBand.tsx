import React from 'react';
import { site } from '@/content/site';
import { Topography } from './Topography';
import styles from './CtaBand.module.css';

// Closing call-to-action. Its own section (a contained card), kept separate
// from the footer on purpose.
export const CtaBand: React.FC = () => {
  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.panel}>
          <div className={styles.aurora} aria-hidden="true" />
          <Topography className={styles.topo} />
          <div className={styles.content}>
            <h2 className={styles.heading}>Got something to build?</h2>
            <p className={styles.text}>
              A custom platform, a tricky data problem, or just a question about
              one of our products. Tell us what you&apos;re working on, and we read
              every message.
            </p>
            <div className={styles.actions}>
              <a href={site.urls.contact} className={styles.btn}>
                Get in touch
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
                </svg>
              </a>
              <a href={site.urls.insight} target="_blank" rel="noopener noreferrer" className={styles.btnSecondary}>
                Try Insight free
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
