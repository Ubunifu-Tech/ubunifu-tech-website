import React from 'react';
import Link from 'next/link';
import { site, footerColumns } from '@/content/site';
import { Topography } from './Topography';
import styles from './Footer.module.css';

export const Footer: React.FC = () => {
  return (
    <footer className={styles.footer}>
      {/* CTA Section */}
      <div className={styles.ctaSection}>
        <div className={`container ${styles.ctaContainer}`}>
          <div className={styles.ctaAurora} aria-hidden="true" />
          <Topography className={styles.ctaTopo} />
          <div className="grain" />
          <div className={styles.ctaContent}>
            <h2 className={styles.ctaHeading}>Got something to build?</h2>
            <p className={styles.ctaText}>
              A custom platform, a tricky data problem, or just a question about
              one of our products — tell us what you&apos;re working on. We read
              every message.
            </p>
            <div className={styles.ctaActions}>
              <a href={site.urls.contact} className={styles.ctaBtn}>
                Get in touch
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
                </svg>
              </a>
              <a href={site.urls.insight} target="_blank" rel="noopener noreferrer" className={styles.ctaBtnSecondary}>
                Try Insight free
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Footer links */}
      <div className={`container ${styles.container}`}>
        <div className={styles.top}>
          <div className={styles.brand}>
            <div className={styles.logoMark}>U</div>
            <span className={styles.brandName}>
              <span className={styles.brandPrimary}>Ubunifu</span><span className={styles.brandAccent}>Technologies</span>
            </span>
          </div>
          <p className={styles.tagline}>{site.tagline}</p>
        </div>

        <div className={styles.middle}>
          {footerColumns.map((col) => (
            <div key={col.title} className={styles.col}>
              <p className={styles.colLabel}>{col.title}</p>
              {col.links.map((link) => {
                if (link.soon) {
                  return (
                    <span key={link.label} className={styles.colLinkDisabled}>
                      {link.label} <span className={styles.soon}>Soon</span>
                    </span>
                  );
                }
                if (link.external) {
                  return (
                    <a
                      key={link.label}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.colLink}
                    >
                      {link.label}
                    </a>
                  );
                }
                return (
                  <Link key={link.label} href={link.href} className={styles.colLink}>
                    {link.label}
                  </Link>
                );
              })}
            </div>
          ))}

          <div className={styles.col}>
            <p className={styles.colLabel}>Contact</p>
            <a href={`mailto:${site.contact.email}`} className={styles.colLink}>{site.contact.email}</a>
            <a href={`tel:${site.contact.phoneTel}`} className={styles.colLink}>{site.contact.phone}</a>
            <span className={styles.location}>{site.location}</span>
          </div>
        </div>

        <div className={styles.bottom}>
          <p className={styles.copy}>&copy; {new Date().getFullYear()} {site.name} Ltd. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};
