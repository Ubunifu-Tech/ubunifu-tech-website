'use client';

import React from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import styles from './EngagementPaths.module.css';

const ease = [0.16, 1, 0.3, 1] as const;

/**
 * The one binary choice on the site: commission something, or use something that
 * already runs.
 *
 * It reads as a question with two answers, because that is what it is. The two
 * cards are deliberately symmetrical — same shape, same length, same footer — so
 * the eye compares them instead of reading one as the real offer and the other
 * as an afterthought. The hue does the telling apart: orange for the work we
 * take on, violet for the software we already operate.
 *
 * Each card ends on the line that actually decides it. The section lead says the
 * choice comes down to how particular the problem is to you; "Best when …" is
 * where that gets applied, per card, rather than left for the reader to infer.
 *
 * The small labels that used to sit above each heading are gone. They were the
 * eyebrow micro-label this brand avoids, and they carried up to 6rem of dead
 * space beneath them.
 */

type Path = {
  key: 'consulting' | 'products';
  title: string;
  body: string;
  bestWhenLead: string;
  bestWhenEmphasis: string;
  href: string;
  linkLabel: string;
};

const PATHS: ReadonlyArray<Path> = [
  {
    key: 'consulting',
    title: 'Something built for how you work',
    body: 'Bring us the workflow, decision, or system that needs to work better. We shape the approach, build the answer, and agree what happens after launch.',
    bestWhenLead: 'Best when the work is',
    bestWhenEmphasis: 'specific to how your organisation runs',
    href: '/build',
    linkLabel: 'Explore our services',
  },
  {
    key: 'products',
    title: 'Something that already runs',
    body: 'Some problems are common enough that we have already built the software and now operate it ourselves. You use what exists, with hosting and maintenance handled.',
    bestWhenLead: 'Best when the workflow is',
    bestWhenEmphasis: 'one many businesses already share',
    href: '/products',
    linkLabel: 'See our products',
  },
];

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
            Do you need something built, or{' '}
            <span className={styles.headingAccent}>something that already runs</span>?
          </h2>
          <p className={styles.lead}>
            Both are things we do. The right one depends on how particular the problem is
            to you.
          </p>
        </motion.div>

        <div className={styles.paths}>
          {PATHS.map((path, i) => (
            <motion.article
              key={path.key}
              className={styles.path}
              data-path={path.key}
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.28 }}
              transition={{
                duration: reduceMotion ? 0 : 0.62,
                delay: reduceMotion ? 0 : i * 0.08,
                ease,
              }}
            >
              <h3 className={styles.pathTitle}>{path.title}</h3>
              <p className={styles.pathBody}>{path.body}</p>

              <p className={styles.bestWhen}>
                {path.bestWhenLead} <strong>{path.bestWhenEmphasis}</strong>.
              </p>

              <Link href={path.href} className={styles.link}>
                {path.linkLabel} <span aria-hidden="true">→</span>
              </Link>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
};
