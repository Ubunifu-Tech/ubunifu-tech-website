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
          <h2 id="capabilities-index-title" className={styles.heading}>
            What we do
          </h2>
          <p className={styles.lead}>
            We design, build, and maintain the technology your business uses.
          </p>
        </motion.div>

        <ul className={styles.list}>
          {services.map((service, index) => (
            <motion.li
              key={service.key}
              initial={reduceMotion ? false : { opacity: 0, x: 18 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.55 }}
              transition={{ duration: reduceMotion ? 0 : 0.46, delay: reduceMotion ? 0 : index * 0.035, ease }}
            >
              <Link href={`/build#${service.key}`} className={styles.item}>
                <span className={styles.itemTitle}>{service.title}</span>
                <span className={styles.summary}>{service.summary}</span>
                <span className={styles.arrow} aria-hidden="true">→</span>
              </Link>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
};
