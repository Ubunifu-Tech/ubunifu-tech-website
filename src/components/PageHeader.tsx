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
  variant?: 'standard' | 'field' | 'proof' | 'human' | 'contact';
  register?: ReadonlyArray<string>;
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
  variant = 'standard',
  register,
}) => {
  const reduceMotion = useReducedMotion();
  const variantClass = variant === 'standard' ? '' : styles[variant];

  return (
    <header className={`${styles.header} ${artwork ? styles.withArtwork : ''} ${variantClass}`}>
      <div className={styles.backdrop} aria-hidden="true">
        {artwork && (
          <HeroArtwork
            {...artwork}
            mode="background"
            className={styles.artwork}
            preload
          />
        )}
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

        {artwork?.caption && (
          <motion.p
            className={styles.artLabel}
            initial={reduceMotion ? false : 'hidden'}
            animate="visible"
            custom={0.42}
            variants={fade}
          >
            {artwork.caption}
          </motion.p>
        )}

        {register && register.length > 0 && (
          <motion.ul
            className={styles.register}
            initial={reduceMotion ? false : 'hidden'}
            animate="visible"
            custom={0.48}
            variants={fade}
            aria-label={`${eyebrow} overview`}
          >
            {register.map((item, index) => (
              <li key={item}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                {item}
              </li>
            ))}
          </motion.ul>
        )}
      </div>
    </header>
  );
};
