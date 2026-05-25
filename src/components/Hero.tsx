'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
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
  const reduceMotion = useReducedMotion();

  return (
    <section className={styles.hero}>
      {/* Subtle grid backdrop */}
      <div className={styles.gridOverlay} aria-hidden="true" />

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
          <span className={styles.gradientWrap}>
            <span className={styles.titleGradient}>for Africa.</span>
            <svg
              className={styles.underline}
              viewBox="0 0 300 18"
              fill="none"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <motion.path
                d="M4 12 Q 150 2 296 11"
                stroke="var(--brand)"
                strokeWidth="3"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                initial={{ pathLength: reduceMotion ? 1 : 0 }}
                animate={{ pathLength: 1 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.85,
                  delay: reduceMotion ? 0 : 1,
                  ease: [0.16, 1, 0.3, 1],
                }}
              />
            </svg>
          </span>
        </motion.h1>

        <motion.p
          className={styles.subtitle}
          initial="hidden"
          animate="visible"
          custom={0.35}
          variants={fadeUp}
        >
          Products and consulting for businesses in Tanzania, from AI-powered
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
          <a href="/products" className={styles.btnPrimary}>
            Explore products
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
            </svg>
          </a>
          <a href="#contact" className={styles.btnSecondary}>
            Get in touch
          </a>
        </motion.div>
      </div>
    </section>
  );
};
