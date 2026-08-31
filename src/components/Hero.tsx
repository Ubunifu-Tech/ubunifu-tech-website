'use client';

import React from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { Topography } from './Topography';
import { HeroArtwork } from './HeroArtwork';
import styles from './Hero.module.css';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.72, delay, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

const credentials = [
  { index: '01', label: 'Strategy through support' },
  { index: '02', label: 'Senior, hands-on team' },
  { index: '03', label: 'Built in Arusha' },
];

export const Hero: React.FC = () => {
  const reduceMotion = useReducedMotion();

  return (
    <section className={styles.hero} aria-labelledby="home-hero-title">
      <div className={styles.backdrop} aria-hidden="true">
        <Topography className={styles.topo} />
        <HeroArtwork
          primary={{
            src: '/editorial/home-system-hero.webp',
            alt: 'Tactile system landscape showing scattered business inputs converging into one coherent modular operating system',
          }}
          mode="background"
          className={styles.artwork}
          preload
        />
        <div className="grain" />
      </div>

      <div className={styles.brandEdge} aria-hidden="true">
        <span />
        <span />
      </div>

      <div className={styles.marquee}>
        <motion.div
          className={styles.eyebrowRow}
          initial={reduceMotion ? false : 'hidden'}
          animate="visible"
          custom={0.04}
          variants={fadeUp}
        >
          <p>Technology consulting · Arusha, Tanzania · East Africa</p>
        </motion.div>

        <motion.h1
          id="home-hero-title"
          className={styles.title}
          initial={reduceMotion ? false : 'hidden'}
          animate="visible"
          custom={0.12}
          variants={fadeUp}
        >
          Build the system your business{' '}
          <span className={styles.titleAccent}>actually needs.</span>
        </motion.h1>

        <div className={styles.supportRow}>
          <motion.p
            className={styles.subtitle}
            initial={reduceMotion ? false : 'hidden'}
            animate="visible"
            custom={0.24}
            variants={fadeUp}
          >
            Ubunifu Technologies brings strategy, brand, software, data, and AI
            into one practical partnership—from the first question to a system
            your organisation can run and improve.
          </motion.p>

          <motion.div
            className={styles.actions}
            initial={reduceMotion ? false : 'hidden'}
            animate="visible"
            custom={0.34}
            variants={fadeUp}
          >
            <Link href="/contact" className={styles.btnPrimary}>
              Bring us a problem <span aria-hidden="true">→</span>
            </Link>
            <Link href="/work" className={styles.btnSecondary}>
              See selected work <span aria-hidden="true">↗</span>
            </Link>
          </motion.div>
        </div>

        <p className={styles.artNote} aria-hidden="true">
          01 / From a real problem to a system you can run
        </p>
      </div>

      <motion.div
        className={styles.credentialRail}
        initial={reduceMotion ? false : 'hidden'}
        animate="visible"
        custom={0.46}
        variants={fadeUp}
      >
        <ul className={styles.credentials} aria-label="How Ubunifu works">
          {credentials.map((item) => (
            <li key={item.index} className={styles.credential}>
              <span className={styles.credentialIndex}>{item.index}</span>
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
        <Link href="/build" className={styles.approachLink}>
          Our capabilities <span aria-hidden="true">↗</span>
        </Link>
      </motion.div>
    </section>
  );
};
