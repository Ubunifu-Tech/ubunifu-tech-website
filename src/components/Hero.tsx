'use client';

import React from 'react';
import { motion } from 'framer-motion';
import styles from './Hero.module.css';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

export const Hero: React.FC = () => {
  return (
    <section className={styles.hero}>
      {/* Aurora gradient background */}
      <div className={styles.aurora} aria-hidden="true">
        <div className={styles.auroraBlob1} />
        <div className={styles.auroraBlob2} />
        <div className={styles.auroraBlob3} />
      </div>

      {/* Grid overlay */}
      <div className={styles.gridOverlay} aria-hidden="true" />

      {/* Floating orbs */}
      <div className={styles.orbs} aria-hidden="true">
        <div className={styles.orb1} />
        <div className={styles.orb2} />
        <div className={styles.orb3} />
      </div>

      <div className={`container ${styles.container}`}>
        <motion.div
          className={styles.badge}
          initial="hidden"
          animate="visible"
          custom={0.1}
          variants={fadeUp}
        >
          <span className={styles.badgeDot} />
          Built in Arusha, Tanzania
        </motion.div>

        <motion.h1
          className={styles.title}
          initial="hidden"
          animate="visible"
          custom={0.2}
          variants={fadeUp}
        >
          We build software
          <br />
          <span className={styles.titleGradient}>for Africa.</span>
        </motion.h1>

        <motion.p
          className={styles.subtitle}
          initial="hidden"
          animate="visible"
          custom={0.35}
          variants={fadeUp}
        >
          Products and consulting for businesses in Tanzania — from AI-powered
          document intelligence to business management, designed for how this
          market actually works.
        </motion.p>

        <motion.div
          className={styles.actions}
          initial="hidden"
          animate="visible"
          custom={0.5}
          variants={fadeUp}
        >
          <a href="#products" className={styles.btnPrimary}>
            Explore products
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
            </svg>
          </a>
          <a href="#contact" className={styles.btnSecondary}>
            Get in touch
          </a>
        </motion.div>

        {/* Social proof / trust */}
        <motion.div
          className={styles.metrics}
          initial="hidden"
          animate="visible"
          custom={0.65}
          variants={fadeUp}
        >
          <div className={styles.metric}>
            <span className={styles.metricValue}>2</span>
            <span className={styles.metricLabel}>Live Products</span>
          </div>
          <div className={styles.metricDivider} />
          <div className={styles.metric}>
            <span className={styles.metricValue}>M-Pesa</span>
            <span className={styles.metricLabel}>Payments Supported</span>
          </div>
          <div className={styles.metricDivider} />
          <div className={styles.metric}>
            <span className={styles.metricValue}>EN / SW</span>
            <span className={styles.metricLabel}>Languages</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
