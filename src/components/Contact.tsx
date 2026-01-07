'use client';

import React from 'react';
import { Button } from './ui/Button';
import styles from './Contact.module.css';

export const Contact: React.FC = () => {
  return (
    <section id="contact" className={styles.contact}>
      <div className="container">
        <div className={`${styles.wrapper} glass-panel`}>
          <div className={styles.info}>
            <h2 className={styles.heading}>Ready to Get <br/> Started?</h2>
            <p className={styles.text}>
              Whether you need help analyzing your Excel data, building an AI system, designing a brand identity, or creating a website—we're here to help. Free consultation to discuss your needs and explore digital solutions for your business.
            </p>
            <div className={styles.details}>
              <div className={styles.detailItem}>
                <strong>Email</strong>
                <a href="mailto:richardpallangyo@ubunifutech.com">richardpallangyo@ubunifutech.com</a>
              </div>
              <div className={styles.detailItem}>
                <strong>Location</strong>
                <span>Dar es Salaam, Tanzania</span>
              </div>
            </div>
          </div>

          <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
            <div className={styles.grid}>
              <div className={styles.field}>
                <label htmlFor="name">Name</label>
                <input type="text" id="name" placeholder="John Doe" required />
              </div>
              <div className={styles.field}>
                <label htmlFor="email">Email</label>
                <input type="email" id="email" placeholder="john@company.com" required />
              </div>
            </div>
            <div className={styles.field}>
              <label htmlFor="company">Company (Optional)</label>
              <input type="text" id="company" placeholder="Your Company" />
            </div>
            <div className={styles.field}>
              <label htmlFor="message">What can we help you with?</label>
              <textarea id="message" rows={4} placeholder="E.g., 'Need help understanding our sales data in Excel' or 'Want to redesign our logo and brand' or 'Looking to build a modern website'..." required></textarea>
            </div>
            <Button size="lg" variant="primary" style={{ width: '100%' }}>Get Free Consultation</Button>
          </form>
        </div>
      </div>
    </section>
  );
};
