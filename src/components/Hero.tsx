'use client';

import React from 'react';
import styles from './Hero.module.css';

export const Hero: React.FC = () => {
  return (
    <section className={styles.hero}>
      {/* Gradient mesh background */}
      <div className={styles.gradientMesh} aria-hidden="true" />

      {/* Dot grid overlay */}
      <div className={styles.dotGrid} aria-hidden="true" />

      {/* Floating geometric shapes */}
      <div className={styles.shapes} aria-hidden="true">
        <div className={`${styles.shape} ${styles.shapeRing}`}>
          <svg viewBox="0 0 200 200" fill="none">
            <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="1.5" strokeDasharray="8 6" />
          </svg>
        </div>
        <div className={`${styles.shape} ${styles.shapeSquare}`} />
        <div className={`${styles.shape} ${styles.shapeDot}`} />
        <div className={`${styles.shape} ${styles.shapeCircleFill}`} />
        <div className={`${styles.shape} ${styles.shapeCross}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 2v20M2 12h20" />
          </svg>
        </div>
      </div>

      <div className={`container ${styles.container}`}>
        {/* Location badge */}
        <div className={`${styles.locationBadge} ${styles.fadeUp} ${styles.delay1}`}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          Arusha, Tanzania
        </div>

        <h1 className={`${styles.title} ${styles.fadeUp} ${styles.delay2}`}>
          We build software<br />
          <span className={styles.titleGradient}>for Africa.</span>
        </h1>

        <p className={`${styles.subtitle} ${styles.fadeUp} ${styles.delay3}`}>
          Ubunifu Technologies builds products and provides consulting for businesses
          in Tanzania — from AI-powered tools to custom websites, designed for how
          this market actually works.
        </p>

        <div className={`${styles.actions} ${styles.fadeUp} ${styles.delay4}`}>
          <a href="#products" className={styles.btnPrimary}>
            See our products
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
          </a>
          <a href="#contact" className={styles.btnSecondary}>Get in touch</a>
        </div>

        {/* Trust indicators */}
        <div className={`${styles.trust} ${styles.fadeUp} ${styles.delay5}`}>
          <div className={styles.trustItem}>
            <span className={styles.trustDot} />
            Ubunifu Insight — Live
          </div>
          <div className={styles.trustDivider} />
          <div className={styles.trustItem}>
            M-Pesa & Card payments
          </div>
          <div className={styles.trustDivider} />
          <div className={styles.trustItem}>
            English & Swahili
          </div>
        </div>
      </div>
    </section>
  );
};
