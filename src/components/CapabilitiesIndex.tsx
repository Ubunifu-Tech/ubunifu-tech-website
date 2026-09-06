'use client';

import React from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { services } from '@/content/services';
import styles from './CapabilitiesIndex.module.css';

const ease = [0.16, 1, 0.3, 1] as const;

export const CapabilitiesIndex: React.FC = () => {
  const reduceMotion = useReducedMotion();

  return (
    <section className={styles.section} aria-labelledby="capabilities-index-title">
      <div className={`container ${styles.layout}`}>
        <motion.div
          className={styles.intro}
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: reduceMotion ? 0 : 0.55, ease }}
        >
          <p className={styles.eyebrow}>Consulting capabilities</p>
          <h2 id="capabilities-index-title" className={styles.heading}>
            Start with the need. Bring in only the disciplines it requires.
          </h2>
          <p className={styles.lead}>
            A project may begin with a website, a reporting gap, a brand that no
            longer fits, or a workflow held together by manual steps. We scope
            the useful combination from there.
          </p>
        </motion.div>

        <ol className={styles.list}>
          {services.map((service, index) => (
            <motion.li
              key={service.key}
              initial={reduceMotion ? false : { opacity: 0, x: 18 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.55 }}
              transition={{ duration: reduceMotion ? 0 : 0.46, delay: reduceMotion ? 0 : index * 0.035, ease }}
            >
              <Link href={`/build#${service.key}`} className={styles.item}>
                <span className={styles.number}>{String(index + 1).padStart(2, '0')}</span>
                <span className={styles.itemTitle}>{service.title}</span>
                <span className={styles.summary}>{service.summary}</span>
                <span className={styles.arrow} aria-hidden="true">→</span>
              </Link>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
};
