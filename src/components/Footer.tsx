import React from 'react';
import Link from 'next/link';
import { site, footerColumns } from '@/content/site';
import styles from './Footer.module.css';

export const Footer: React.FC = () => {
  return (
    <footer className={styles.footer}>
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
