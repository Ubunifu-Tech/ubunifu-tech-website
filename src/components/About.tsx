'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { values } from '@/content/values';
import styles from './About.module.css';

export const About: React.FC<{ hideHeader?: boolean }> = ({
  hideHeader = false,
}) => {
  return (
    <section id="about" className={`section ${styles.about}`}>
      <div className="container">
        {!hideHeader && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="eyebrow">About</span>
            <h2 className={styles.heading}>Why we exist</h2>
            <p className={styles.intro}>
              Ubunifu Technologies is a digital-solutions agency in Arusha. We help
              businesses and organisations across Tanzania with web, data, AI,
              branding, and strategy, building from how this market actually works.
              We ship our own products too, which is how we know we can build yours.
            </p>
          </motion.div>
        )}

        <div className={styles.grid}>
          {values.map((value, index) => {
            const Icon = value.icon;
            return (
              <motion.div
                key={value.title}
                className={styles.card}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className={styles.iconWrapper}>
                  <Icon size={22} />
                </div>
                <h3 className={styles.valueTitle}>{value.title}</h3>
                <p className={styles.bio}>{value.body}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
