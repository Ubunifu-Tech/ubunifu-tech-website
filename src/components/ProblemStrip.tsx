'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Box, Wrench, ArrowRight } from 'lucide-react';
import styles from './ProblemStrip.module.css';

const items = [
  {
    icon: <Box size={20} />,
    label: 'Products',
    body: 'SaaS tools that solve real problems for African businesses — document AI, business management, and more on the way.',
  },
  {
    icon: <Wrench size={20} />,
    label: 'Consulting',
    body: 'Custom websites, data solutions, and digital strategy for businesses that need hands-on expertise.',
  },
  {
    icon: <ArrowRight size={20} />,
    label: 'Our approach',
    body: 'Everything starts from the workflows, pricing, and infrastructure that exist here — not adapted from elsewhere.',
  },
];

export const ProblemStrip: React.FC = () => {
  return (
    <div className={styles.strip}>
      <div className={`container ${styles.inner}`}>
        {items.map((item, index) => (
          <motion.div
            key={item.label}
            className={styles.item}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className={styles.iconLabel}>
              <span className={styles.icon}>{item.icon}</span>
              <p className={styles.label}>{item.label}</p>
            </div>
            <p className={styles.body}>{item.body}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
