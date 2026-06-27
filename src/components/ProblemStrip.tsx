'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { pillars } from '@/content/pillars';
import styles from './ProblemStrip.module.css';

export const ProblemStrip: React.FC = () => {
  return (
    <section className={styles.strip}>
      <div className={`container ${styles.inner}`}>
        <motion.div
          className={styles.media}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          <Image
            src="/editorial/tanzania-digital-map.png"
            alt="Editorial illustration of a Tanzania-inspired terrain map with digital network paths"
            fill
            sizes="(max-width: 900px) 100vw, 560px"
            className={styles.image}
          />
          <div className={styles.mediaShade} aria-hidden="true" />
          <span className={styles.mediaLabel}>Arusha, Tanzania</span>
        </motion.div>

        <motion.div
          className={styles.content}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.55, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="eyebrow">Why Ubunifu</span>
          <h2 className={styles.heading}>Local context, serious engineering.</h2>
          <p className={styles.intro}>
            We are based in Arusha and build around how Tanzanian organisations
            actually work: the market, the devices, the support model, and the
            systems that need to keep running after launch.
          </p>

          <div className={styles.pillars}>
            {pillars.map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className={styles.item}>
                  <span className={styles.number} aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className={styles.icon}>
                    <Icon size={18} />
                  </span>
                  <div>
                    <p className={styles.label}>{item.label}</p>
                    <p className={styles.body}>{item.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
};
