'use client';

import React from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import styles from './EngagementPaths.module.css';

const ease = [0.16, 1, 0.3, 1] as const;

const PathArrow: React.FC = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M4 12h15M13 6l6 6-6 6" />
  </svg>
);

export const EngagementPaths: React.FC = () => {
  const reduceMotion = useReducedMotion();

  return (
    <section className={styles.section} aria-labelledby="engagement-paths-title">
      <div className="container">
        <motion.div
          className={styles.intro}
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: reduceMotion ? 0 : 0.58, ease }}
        >
          <p className={styles.eyebrow}>How to work with us</p>
          <h2 id="engagement-paths-title" className={styles.heading}>
            Commission a tailored system, or use software we already operate.
          </h2>
          <p className={styles.lead}>
            Commission a system shaped around your organisation, or use software
            we already operate for a repeatable workflow.
          </p>
        </motion.div>

        <div className={styles.paths}>
          <motion.article
            className={styles.path}
            initial={reduceMotion ? false : { opacity: 0, x: -18 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.28 }}
            transition={{ duration: reduceMotion ? 0 : 0.62, ease }}
          >
            <div className={styles.pathTopline}>
              <span className={styles.index}>01</span>
              <span>Tailored consulting</span>
            </div>
            <h3>Solve an organisation-specific problem.</h3>
            <p className={styles.pathBody}>
              Bring us the workflow, decision, or system that needs to work
              better. We can shape the approach, design or build the answer,
              and agree what happens after launch.
            </p>
            <div className={styles.sequence} aria-label="A tailored engagement can move from a question to a decision to a working system">
              <span>Question</span>
              <i aria-hidden="true" />
              <span>Decision</span>
              <i aria-hidden="true" />
              <span>Working system</span>
            </div>
            <Link href="/build" className={styles.link}>
              Explore our services <PathArrow />
            </Link>
          </motion.article>

          <motion.article
            className={`${styles.path} ${styles.products}`}
            initial={reduceMotion ? false : { opacity: 0, x: 18 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.28 }}
            transition={{ duration: reduceMotion ? 0 : 0.62, delay: reduceMotion ? 0 : 0.08, ease }}
          >
            <div className={styles.pathTopline}>
              <span className={styles.index}>02</span>
              <span>Ubunifu products</span>
            </div>
            <h3>Use software we build and operate.</h3>
            <p className={styles.pathBody}>
              Insight supports work with documents and knowledge. Sifa supports
              business operations and records. Rafiki is in
              development.
            </p>
            <ul className={styles.productRegister} aria-label="Ubunifu product status">
              <li><span>Insight</span><em>Live</em></li>
              <li><span>Sifa</span><em>Live</em></li>
              <li><span>Rafiki</span><em>In development</em></li>
            </ul>
            <Link href="/products" className={styles.link}>
              See our products <PathArrow />
            </Link>
          </motion.article>
        </div>
      </div>
    </section>
  );
};
