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
  mode?: 'standard' | 'panorama' | 'background';
  preload?: boolean;
  className?: string;
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
  className,
}) => {
  const reduceMotion = useReducedMotion();
  const isPanorama = mode === 'panorama';
  const isBackground = mode === 'background';

  return (
    <motion.figure
      className={`${styles.figure} ${styles[kind]} ${isPanorama ? styles.panorama : ''} ${isBackground ? styles.background : ''} ${className ?? ''}`}
      aria-hidden={isBackground || undefined}
      initial={
        reduceMotion
          ? false
          : isPanorama || isBackground
            ? { opacity: 0, scale: isBackground ? 1.015 : 1 }
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
          alt={isBackground ? '' : primary.alt}
          fill
          preload={preload}
          draggable={false}
          sizes={
            isBackground
              ? '100vw'
              : isPanorama
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
            alt={isBackground ? '' : secondary.alt}
            fill
            draggable={false}
            sizes={isBackground ? '(max-width: 660px) 100vw, 44vw' : '(max-width: 840px) 44vw, 460px'}
            className={`${styles.image} ${focusClass[secondary.focus ?? 'center']}`}
          />
        </div>
      )}

      {caption && !isBackground && (
        <figcaption className={styles.caption}>
          <span aria-hidden="true" />
          {caption}
        </figcaption>
      )}
    </motion.figure>
  );
};
