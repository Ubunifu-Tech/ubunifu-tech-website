'use client';

import React from 'react';
import { motion } from 'framer-motion';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
  eyebrow: string;
  title: React.ReactNode;
  lead?: string;
  children?: React.ReactNode;
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
}) => {
  return (
    <header className={styles.header}>
      <div className="container">
        <motion.span
          className="eyebrow"
          initial="hidden"
          animate="visible"
          custom={0.05}
          variants={fade}
        >
          {eyebrow}
        </motion.span>

        <motion.h1
          className={styles.title}
          initial="hidden"
          animate="visible"
          custom={0.15}
          variants={fade}
        >
          {title}
        </motion.h1>

        {lead && (
          <motion.p
            className={styles.lead}
            initial="hidden"
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
            initial="hidden"
            animate="visible"
            custom={0.35}
            variants={fade}
          >
            {children}
          </motion.div>
        )}
      </div>
    </header>
  );
};
