'use client';

import React from 'react';
import styles from './Contact.module.css';

export const Contact: React.FC = () => {
  return (
    <section id="contact" className={styles.contact}>
      <div className="container">
        <span className="eyebrow">Contact</span>
        <h2 className={styles.heading}>Get in touch</h2>
        <p className={styles.text}>
          Have a question about Ubunifu Insight, or interested in what we are building next?
          Reach us directly — we respond to every message.
        </p>

        <div className={styles.methods}>
          <div className={styles.method}>
            <p className={styles.methodLabel}>Email</p>
            <a href="mailto:info@ubunifutech.com" className={styles.methodLink}>
              info@ubunifutech.com
            </a>
          </div>

          <div className={styles.method}>
            <p className={styles.methodLabel}>Phone</p>
            <a href="tel:+255765948816" className={styles.methodLink}>
              +255 765 948 816
            </a>
          </div>

          <div className={styles.method}>
            <p className={styles.methodLabel}>Location</p>
            <span className={styles.methodText}>Dar es Salaam, Tanzania</span>
          </div>
        </div>
      </div>
    </section>
  );
};
