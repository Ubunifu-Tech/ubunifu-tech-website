'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { pillars } from '@/content/pillars';
import styles from './ProblemStrip.module.css';

export const ProblemStrip: React.FC = () => {
  return (
    <div className={styles.strip}>
      <div className={`container ${styles.inner}`}>
        {pillars.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.label}
              className={styles.item}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className={styles.iconLabel}>
                <span className={styles.icon}>
                  <Icon size={20} />
                </span>
                <p className={styles.label}>{item.label}</p>
              </div>
              <p className={styles.body}>{item.body}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
