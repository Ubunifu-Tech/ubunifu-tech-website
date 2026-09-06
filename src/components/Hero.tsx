'use client';

import React from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { Topography } from './Topography';
import { HeroArtwork } from './HeroArtwork';
import { SystemsField } from './SystemsField';
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
        <SystemsField className={styles.systemsField} />
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
          <p>Ubunifu Technologies · Arusha, Tanzania</p>
        </motion.div>

        <motion.h1
          id="home-hero-title"
          className={styles.title}
          initial={reduceMotion ? false : 'hidden'}
          animate="visible"
          custom={0.12}
          variants={fadeUp}
        >
          Build the system your organisation{' '}
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
            We help Tanzanian organisations make technology decisions, then
            advise, design, build, host, and support the result. We also build
            and operate software products of our own.
          </motion.p>

          <motion.div
            className={styles.actions}
            initial={reduceMotion ? false : 'hidden'}
            animate="visible"
            custom={0.34}
            variants={fadeUp}
          >
            <Link href="/contact" className={styles.btnPrimary}>
              Discuss a problem <span aria-hidden="true">→</span>
            </Link>
            <Link href="/work" className={styles.btnSecondary}>
              See selected work <span aria-hidden="true">→</span>
            </Link>
          </motion.div>
        </div>

        <p className={styles.artNote}>
          Conceptual illustration · Inputs assemble into one coherent working system
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
          Our capabilities <span aria-hidden="true">→</span>
        </Link>
      </motion.div>
    </section>
  );
};
