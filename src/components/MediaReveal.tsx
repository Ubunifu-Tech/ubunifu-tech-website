'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import styles from './MediaReveal.module.css';

const ease = [0.16, 1, 0.3, 1] as const;

type MediaRevealProps = React.PropsWithChildren<{
  className?: string;
}>;

export const MediaReveal: React.FC<MediaRevealProps> = ({ children, className = '' }) => {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={`${styles.root} ${className}`}
      initial={reduceMotion ? false : { scale: 1.035 }}
      whileInView={{ scale: 1 }}
      viewport={{ once: true, amount: 0.24 }}
      transition={{ duration: reduceMotion ? 0 : 0.9, ease }}
    >
      {children}
      {!reduceMotion && (
        <motion.span
          className={styles.shutter}
          initial={{ scaleX: 1 }}
          whileInView={{ scaleX: 0 }}
          viewport={{ once: true, amount: 0.24 }}
          transition={{ duration: 0.76, delay: 0.06, ease }}
          aria-hidden="true"
        />
      )}
    </motion.div>
  );
};
