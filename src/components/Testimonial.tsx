'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { testimonials, type Testimonial as TestimonialType } from '@/content/testimonials';
import styles from './Testimonial.module.css';

const ease = [0.16, 1, 0.3, 1] as const;

type Props = {
  /**
   * Pick a specific testimonial by associated project slug. If omitted,
   * the first testimonial is used.
   */
  project?: TestimonialType['project'];
  /** Hide the eyebrow + section heading (for use inside other cards). */
  hideHeader?: boolean;
};

export const Testimonial: React.FC<Props> = ({ project, hideHeader = false }) => {
  const testimonial = project
    ? testimonials.find((t) => t.project === project)
    : testimonials[0];

  if (!testimonial) return null;

  const initials = testimonial.authorName
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <section className={`section ${styles.section}`}>
      <div className="container">
        <motion.div
          className={styles.layout}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.55, ease }}
        >
          {!hideHeader && (
            <div className={styles.head}>
              <span className="eyebrow">In their words</span>
              <h2 className={styles.heading}>What clients say after we ship</h2>
            </div>
          )}

          <figure className={styles.card}>
            {/* Decorative quote mark */}
            <span className={styles.quoteMark} aria-hidden="true">
              &ldquo;
            </span>

            <blockquote className={styles.quote}>
              {testimonial.quote}
            </blockquote>

            <figcaption className={styles.attribution}>
              <div className={styles.avatar} aria-hidden="true">
                {initials}
              </div>
              <div className={styles.attributionText}>
                <p className={styles.authorName}>{testimonial.authorName}</p>
                <p className={styles.authorMeta}>
                  {testimonial.authorRole}
                  {testimonial.organization ? (
                    <>
                      {', '}
                      {testimonial.organizationUrl ? (
                        <a
                          href={testimonial.organizationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.orgLink}
                        >
                          {testimonial.organization}
                        </a>
                      ) : (
                        testimonial.organization
                      )}
                    </>
                  ) : null}
                </p>
              </div>
            </figcaption>
          </figure>
        </motion.div>
      </div>
    </section>
  );
};
