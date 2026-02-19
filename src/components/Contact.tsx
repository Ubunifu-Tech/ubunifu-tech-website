'use client';

import React from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';
import styles from './Contact.module.css';

export const Contact: React.FC = () => {
  return (
    <section id="contact" className={styles.contact}>
      <div className="container">
        <span className="eyebrow">Contact</span>
        <h2 className={styles.heading}>Get in touch</h2>
        <p className={styles.text}>
          Have a question about our products, or interested in working with us?
          Reach us directly — we respond to every message.
        </p>

        <div className={styles.methods}>
          <div className={styles.method}>
            <div className={styles.methodIcon}><Mail size={18} /></div>
            <div>
              <p className={styles.methodLabel}>Email</p>
              <a href="mailto:info@ubunifutech.com" className={styles.methodLink}>
                info@ubunifutech.com
              </a>
            </div>
          </div>

          <div className={styles.method}>
            <div className={styles.methodIcon}><Phone size={18} /></div>
            <div>
              <p className={styles.methodLabel}>Phone</p>
              <a href="tel:+255765948816" className={styles.methodLink}>
                +255 765 948 816
              </a>
            </div>
          </div>

          <div className={styles.method}>
            <div className={styles.methodIcon}><MapPin size={18} /></div>
            <div>
              <p className={styles.methodLabel}>Location</p>
              <span className={styles.methodText}>Arusha, Tanzania</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
