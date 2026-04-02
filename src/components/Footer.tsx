import React from 'react';
import Link from 'next/link';
import styles from './Footer.module.css';

export const Footer: React.FC = () => {
  return (
    <footer className={styles.footer}>
      {/* CTA Section */}
      <div className={styles.ctaSection}>
        <div className={`container ${styles.ctaContainer}`}>
          <div className={styles.ctaAurora} aria-hidden="true" />
          <div className={styles.ctaContent}>
            <h2 className={styles.ctaHeading}>Ready to build something?</h2>
            <p className={styles.ctaText}>
              Whether you need a SaaS product, a custom website, or consulting — we&apos;re here to help.
            </p>
            <div className={styles.ctaActions}>
              <a href="#contact" className={styles.ctaBtn}>
                Get in touch
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
                </svg>
              </a>
              <a href="https://insight.ubunifutech.com" target="_blank" rel="noopener noreferrer" className={styles.ctaBtnSecondary}>
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
            <span className={styles.brandName}>Ubunifu Technologies</span>
          </div>
          <p className={styles.tagline}>Building software for Africa.</p>
        </div>

        <div className={styles.middle}>
          <div className={styles.col}>
            <p className={styles.colLabel}>Products</p>
            <a href="https://insight.ubunifutech.com" target="_blank" rel="noopener noreferrer" className={styles.colLink}>
              Ubunifu Insight
            </a>
            <a href="https://sifa.ubunifutech.com" target="_blank" rel="noopener noreferrer" className={styles.colLink}>
              Ubunifu Sifa
            </a>
            <span className={styles.colLinkDisabled}>Ubunifu Rafiki <span className={styles.soon}>Soon</span></span>
            <Link href="/build" className={styles.colLink}>Ubunifu Build</Link>
          </div>

          <div className={styles.col}>
            <p className={styles.colLabel}>Company</p>
            <Link href="/#about" className={styles.colLink}>About</Link>
            <Link href="/blog" className={styles.colLink}>Blog</Link>
            <Link href="/careers" className={styles.colLink}>Careers</Link>
          </div>

          <div className={styles.col}>
            <p className={styles.colLabel}>Contact</p>
            <a href="mailto:info@ubunifutech.com" className={styles.colLink}>info@ubunifutech.com</a>
            <a href="tel:+255765948816" className={styles.colLink}>+255 765 948 816</a>
            <span className={styles.location}>Arusha, Tanzania</span>
          </div>
        </div>

        <div className={styles.bottom}>
          <p className={styles.copy}>&copy; {new Date().getFullYear()} Ubunifu Technologies Ltd. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};
