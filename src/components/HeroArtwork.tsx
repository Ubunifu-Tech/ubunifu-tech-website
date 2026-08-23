'use client';

import React from 'react';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import styles from './HeroArtwork.module.css';

export type HeroArtworkAsset = {
  src: string;
  alt: string;
  focus?: 'center' | 'left' | 'right' | 'top';
};

export type HeroArtworkConfig = {
  primary: HeroArtworkAsset;
  secondary?: HeroArtworkAsset;
  caption?: string;
  kind?: 'editorial' | 'proof';
};

type HeroArtworkProps = HeroArtworkConfig & {
  mode?: 'standard' | 'panorama';
  preload?: boolean;
};

const focusClass = {
  center: styles.focusCenter,
  left: styles.focusLeft,
  right: styles.focusRight,
  top: styles.focusTop,
};

export const HeroArtwork: React.FC<HeroArtworkProps> = ({
  primary,
  secondary,
  caption,
  kind = 'editorial',
  mode = 'standard',
  preload = false,
}) => {
  const reduceMotion = useReducedMotion();
  const isPanorama = mode === 'panorama';

  return (
    <motion.figure
      className={`${styles.figure} ${styles[kind]} ${isPanorama ? styles.panorama : ''}`}
      initial={
        reduceMotion
          ? false
          : isPanorama
            ? { opacity: 0 }
            : { opacity: 0, y: 16, scale: 0.99 }
      }
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: reduceMotion ? 0 : 0.78,
        delay: reduceMotion ? 0 : 0.22,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      <div className={styles.primary}>
        <Image
          src={primary.src}
          alt={primary.alt}
          fill
          preload={preload}
          draggable={false}
          sizes={
            isPanorama
              ? '(max-width: 660px) 100vw, 1200px'
              : '(max-width: 840px) 100vw, 1280px'
          }
          className={`${styles.image} ${focusClass[primary.focus ?? 'center']}`}
        />
        <span className={styles.imageVeil} aria-hidden="true" />
      </div>

      {secondary && !isPanorama && (
        <div className={styles.secondary}>
          <Image
            src={secondary.src}
            alt={secondary.alt}
            fill
            draggable={false}
            sizes="(max-width: 840px) 44vw, 460px"
            className={`${styles.image} ${focusClass[secondary.focus ?? 'center']}`}
          />
        </div>
      )}

      {caption && (
        <figcaption className={styles.caption}>
          <span aria-hidden="true" />
          {caption}
        </figcaption>
      )}
    </motion.figure>
  );
};
