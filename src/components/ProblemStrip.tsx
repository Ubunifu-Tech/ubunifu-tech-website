import React from 'react';
import { Box, Wrench, ArrowRight } from 'lucide-react';
import styles from './ProblemStrip.module.css';

const items = [
  {
    icon: <Box size={20} />,
    label: 'Products',
    body: 'We build SaaS tools that solve real problems for African businesses — document AI, website widgets, and more on the way.',
  },
  {
    icon: <Wrench size={20} />,
    label: 'Consulting',
    body: 'We design and build custom websites, data solutions, and digital strategy for businesses that need hands-on expertise.',
  },
  {
    icon: <ArrowRight size={20} />,
    label: 'Our approach',
    body: 'Everything starts from the workflows, pricing, and infrastructure that exist here — not adapted from tools built elsewhere.',
  },
];

export const ProblemStrip: React.FC = () => {
  return (
    <div className={styles.strip}>
      <div className={`container ${styles.inner}`}>
        {items.map((item) => (
          <div key={item.label} className={styles.item}>
            <div className={styles.iconLabel}>
              <span className={styles.icon}>{item.icon}</span>
              <p className={styles.label}>{item.label}</p>
            </div>
            <p className={styles.body}>{item.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
