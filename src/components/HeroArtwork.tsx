'use client';

import React, { useRef } from 'react';
import Image from 'next/image';
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion';
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
  const figureRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const isPanorama = mode === 'panorama';
  const isBackground = mode === 'background';
  const { scrollYProgress } = useScroll({
    target: figureRef,
    offset: ['start start', 'end start'],
  });
  const primaryY = useSpring(useTransform(scrollYProgress, [0, 1], [0, 48]), {
    stiffness: 120,
    damping: 26,
    mass: 0.28,
  });
  const primaryScale = useSpring(useTransform(scrollYProgress, [0, 1], [1, 1.035]), {
    stiffness: 120,
    damping: 26,
    mass: 0.28,
  });
  const secondaryY = useSpring(useTransform(scrollYProgress, [0, 1], [0, 26]), {
    stiffness: 120,
    damping: 26,
    mass: 0.28,
  });

  return (
    <motion.figure
      ref={figureRef}
      className={`${styles.figure} ${styles[kind]} ${isPanorama ? styles.panorama : ''} ${isBackground ? styles.background : ''} ${className ?? ''}`}
      aria-hidden={isBackground || undefined}
      initial={
        reduceMotion
          ? false
          : isBackground
            ? { scale: 1.012 }
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
      <motion.div
        className={styles.primary}
        style={isBackground && !reduceMotion ? { y: primaryY, scale: primaryScale } : undefined}
      >
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
      </motion.div>

      {secondary && !isPanorama && (
        <motion.div
          className={styles.secondary}
          style={isBackground && !reduceMotion ? { y: secondaryY } : undefined}
        >
          <Image
            src={secondary.src}
            alt={isBackground ? '' : secondary.alt}
            fill
            draggable={false}
            sizes={isBackground ? '(max-width: 660px) 100vw, 44vw' : '(max-width: 840px) 44vw, 460px'}
            className={`${styles.image} ${focusClass[secondary.focus ?? 'center']}`}
          />
        </motion.div>
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
