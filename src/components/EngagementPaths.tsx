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
          <h2 id="engagement-paths-title" className={styles.heading}>
            Commission a tailored system, or use software we already operate.
          </h2>
          <p className={styles.lead}>
            Which one fits usually comes down to whether the work is specific to
            how your organisation runs, or a workflow that many businesses share.
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
            <p className={styles.bestWhen}>
              Best when the work is <strong>specific to how your organisation runs</strong>.
            </p>
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
              <span>Ubunifu products</span>
            </div>
            <h3>Use software we build and operate.</h3>
            <p className={styles.pathBody}>
              Some problems are common enough that we have already built the
              software and now run it ourselves. You use what exists, with the
              maintenance and hosting already handled, rather than commissioning
              a build.
            </p>
            <p className={styles.bestWhen}>
              Best when the workflow is <strong>one many businesses already share</strong>.
            </p>
            <Link href="/products" className={styles.link}>
              See our products <PathArrow />
            </Link>
          </motion.article>
        </div>
      </div>
    </section>
  );
};
