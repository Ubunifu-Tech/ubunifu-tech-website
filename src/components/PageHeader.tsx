'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Topography } from './Topography';
import { HeroArtwork, type HeroArtworkConfig } from './HeroArtwork';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
  eyebrow: string;
  title: React.ReactNode;
  lead?: string;
  children?: React.ReactNode;
  artwork?: HeroArtworkConfig;
}

const fade = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

export const PageHeader: React.FC<PageHeaderProps> = ({
  eyebrow,
  title,
  lead,
  children,
  artwork,
}) => {
  const reduceMotion = useReducedMotion();

  return (
    <header className={`${styles.header} ${artwork ? styles.withArtwork : ''}`}>
      <div className={styles.backdrop} aria-hidden="true">
        <Topography className={styles.topo} />
        <div className="grain" />
      </div>
      <div className={styles.brandEdge} aria-hidden="true"><span /><span /></div>
      <div className={styles.inner}>
        <motion.div
          className={styles.topline}
          initial={reduceMotion ? false : 'hidden'}
          animate="visible"
          custom={0.05}
          variants={fade}
        >
          <span>{eyebrow}</span>
          <span>Ubunifu Technologies</span>
        </motion.div>

        <motion.h1
          className={styles.title}
          initial={reduceMotion ? false : 'hidden'}
          animate="visible"
          custom={0.15}
          variants={fade}
        >
          {title}
        </motion.h1>

        <div className={styles.supportRow}>
          {lead && (
            <motion.p
              className={styles.lead}
              initial={reduceMotion ? false : 'hidden'}
              animate="visible"
              custom={0.25}
              variants={fade}
            >
              {lead}
            </motion.p>
          )}

          {children && (
            <motion.div
              className={styles.actions}
              initial={reduceMotion ? false : 'hidden'}
              animate="visible"
              custom={0.35}
              variants={fade}
            >
              {children}
            </motion.div>
          )}
        </div>

        {artwork && <HeroArtwork {...artwork} preload />}
      </div>
    </header>
  );
};
