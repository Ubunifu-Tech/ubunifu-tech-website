'use client';

import React from 'react';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { Topography } from './Topography';
import styles from './Hero.module.css';

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

const trust = ['2 live products', 'Client platforms in production', 'Swahili-first AI'];

export const Hero: React.FC = () => {
  const reduceMotion = useReducedMotion();

  return (
    <section className={styles.hero}>
      {/* Signature backdrop */}
      <div className={styles.backdrop} aria-hidden="true">
        <div className={`aurora ${styles.auroraOrange}`} />
        <div className={`aurora ${styles.auroraPurple}`} />
        <div className="blueprint" />
        <Topography className={styles.topo} />
        <div className="grain" />
      </div>

      <div className={`container ${styles.container}`}>
        <div className={styles.layout}>
          {/* Left: the message */}
          <div className={styles.lead}>
            <motion.p
              className={`specLabel ${styles.spec}`}
              initial="hidden"
              animate="visible"
              custom={0.05}
              variants={fadeUp}
            >
              Software studio — Arusha, Tanzania
            </motion.p>

            <motion.h1
              className={styles.title}
              initial="hidden"
              animate="visible"
              custom={0.15}
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
              custom={0.3}
              variants={fadeUp}
            >
              A software studio in Arusha. We take on custom builds for businesses
              across the continent, and ship our own products — made for how things
              actually work here, not adapted from somewhere else.
            </motion.p>

            <motion.div
              className={styles.actions}
              initial="hidden"
              animate="visible"
              custom={0.45}
              variants={fadeUp}
            >
              <a href="/contact" className={styles.btnPrimary}>
                Start a project
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
                </svg>
              </a>
              <a href="/products" className={styles.btnSecondary}>
                Explore our products
              </a>
            </motion.div>

            <motion.ul
              className={styles.trust}
              initial="hidden"
              animate="visible"
              custom={0.6}
              variants={fadeUp}
            >
              {trust.map((item) => (
                <li key={item} className={styles.trustItem}>
                  {item}
                </li>
              ))}
            </motion.ul>
          </div>

          {/* Right: live product proof */}
          <motion.div
            className={styles.proof}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className={styles.browser}>
              <div className={styles.browserBar}>
                <span className={styles.dot} />
                <span className={styles.dot} />
                <span className={styles.dot} />
                <span className={styles.url}>sifa.ubunifutech.com</span>
              </div>
              <div className={styles.shot}>
                <Image
                  src="/work/sifa-dashboard.png"
                  alt="Ubunifu Sifa dashboard showing sales, stock and credit aging for a Tanzanian shop"
                  fill
                  sizes="(max-width: 980px) 100vw, 520px"
                  className={styles.shotImg}
                  priority
                />
              </div>
            </div>
            <span className={styles.proofTag}>
              <span className={styles.proofDot} />
              Ubunifu Sifa · live
            </span>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
