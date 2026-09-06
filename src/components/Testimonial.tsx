'use client';

import React from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { testimonials } from '@/content/testimonials';
import styles from './Testimonial.module.css';

const ease = [0.16, 1, 0.3, 1] as const;

type Props = {
  /**
   * Pick a specific testimonial by associated project slug. If omitted,
   * the first testimonial is used.
   */
  project?: string;
  /** Hide the eyebrow + section heading (for use inside other cards). */
  hideHeader?: boolean;
};

export const Testimonial: React.FC<Props> = ({ project, hideHeader = false }) => {
  const reduceMotion = useReducedMotion();
  const testimonial = project
    ? testimonials.find((t) => t.project === project)
    : testimonials[0];

  if (!testimonial) return null;

  return (
    <section className={`section ${styles.section}`}>
      <div className="container">
        <motion.div
          className={styles.layout}
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: reduceMotion ? 0 : 0.55, ease }}
        >
          {!hideHeader && (
            <div className={styles.head}>
              <span className="eyebrow">Client perspective</span>
              <h2 className={styles.heading}>What clients say after we ship</h2>
              <p className={styles.note}>Paraphrased client feedback · edited for length and clarity</p>
            </div>
          )}

          <figure className={styles.card}>
            <p className={styles.evidenceLabel}>01 / Client evidence</p>

            <p className={styles.quote}>{testimonial.pullQuote}</p>

            <figcaption className={styles.attribution}>
              <div className={styles.attributionText}>
                <p className={styles.organization}>{testimonial.organization}</p>
                <p className={styles.authorMeta}>
                  <span className={styles.authorName}>{testimonial.authorName}</span>
                  {' · '}{testimonial.authorRole}
                </p>
              </div>
              <div className={styles.evidenceLinks}>
                {testimonial.organizationUrl && (
                  <a
                    href={testimonial.organizationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.orgLink}
                  >
                    Visit organisation <span aria-hidden="true">↗</span>
                    <span className="srOnly"> (opens in a new tab)</span>
                  </a>
                )}
                {testimonial.project && project !== testimonial.project && (
                  <Link href={`/work/${testimonial.project}`} className={styles.orgLink}>
                    Read the case study <span aria-hidden="true">→</span>
                  </Link>
                )}
              </div>
            </figcaption>
          </figure>
        </motion.div>
      </div>
    </section>
  );
};
