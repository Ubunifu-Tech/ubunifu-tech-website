'use client';

import React from 'react';
import { Button } from './ui/Button';
import styles from './Contact.module.css';

export const Contact: React.FC = () => {
  return (
    <section id="contact" className={styles.contact}>
      <div className="container">
        <div className={`${styles.wrapper} glass-panel`}>
          <div className={styles.contactContent}>
            <h2 className={styles.heading}>Ready to Get <br/> Started?</h2>
            <p className={styles.text}>
              Whether you need help analyzing your Excel data, building an AI system, designing a brand identity, or creating a website—we're here to help. Free consultation to discuss your needs and explore digital solutions for your business.
            </p>
            
            <div className={styles.contactMethods}>
              <div className={styles.contactCard}>
                <div className={styles.contactIcon}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                    <path d="m2 7 10 6 10-6"/>
                  </svg>
                </div>
                <div className={styles.contactInfo}>
                  <strong>Email</strong>
                  <a href="mailto:richardpallangyo@ubunifutech.com" className={styles.contactLink}>
                    richardpallangyo@ubunifutech.com
                  </a>
                </div>
              </div>

              <div className={styles.contactCard}>
                <div className={styles.contactIcon}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                </div>
                <div className={styles.contactInfo}>
                  <strong>Phone</strong>
                  <a href="tel:+255765948816" className={styles.contactLink}>
                    +255 765 948 816
                  </a>
                </div>
              </div>

              <div className={styles.contactCard}>
                <div className={styles.contactIcon}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <div className={styles.contactInfo}>
                  <strong>Location</strong>
                  <span className={styles.contactText}>Tanzania</span>
                </div>
              </div>
            </div>

            <div className={styles.formNote}>
              <p>Contact form coming soon. For now, please reach out via email or phone for all inquiries.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
