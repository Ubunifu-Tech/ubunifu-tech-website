'use client';

import React from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { testimonials } from '@/content/testimonials';
import styles from './Testimonial.module.css';

const ease = [0.16, 1, 0.3, 1] as const;

/** "https://www.usambaradestination.com/" → "usambaradestination.com" */
function displayHost(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return url;
  }
}

type Props = {
  /**
   * Pick a specific testimonial by associated project slug. If omitted,
   * the first testimonial is used.
   */
  project?: string;
};

/**
 * The only third-party proof on the site, presented as a full-width light band
 * so the quote remains the section rather than a column inside a card.
 *
 * The naming is deliberate: a visually-hidden h2 keeps "Client feedback" in the
 * document outline without printing a small label above a quote that speaks
 * perfectly well for itself.
 *
 * There is no on-page paraphrase disclosure: removed at the owner's request.
 * content/testimonials.tsx still records that this copy is edited for length, so
 * the wording shown here should be one the client has agreed to.
 */
export const Testimonial: React.FC<Props> = ({ project }) => {
  const reduceMotion = useReducedMotion();
  const testimonial = project
    ? testimonials.find((t) => t.project === project)
    : testimonials[0];

  if (!testimonial) return null;

  return (
    <section className={styles.section} aria-labelledby="testimonial-title">
      <div className="container">
        <h2 id="testimonial-title" className="srOnly">
          Client feedback
        </h2>

        <motion.figure
          className={styles.card}
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: reduceMotion ? 0 : 0.55, ease }}
        >
          <blockquote className={styles.quote}>{testimonial.pullQuote}</blockquote>

          <figcaption className={styles.foot}>
            <div className={styles.who}>
              <p className={styles.org}>{testimonial.organization}</p>
              <p className={styles.author}>
                {testimonial.authorName} · {testimonial.authorRole}
              </p>
            </div>

            {/* The address is the point: the site they are talking about is
                running, and a stranger can go and read it for themselves. */}
            <div className={styles.links}>
              {testimonial.organizationUrl && (
                <a
                  href={testimonial.organizationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.link}
                >
                  {displayHost(testimonial.organizationUrl)}
                  <ArrowUpRight size={15} strokeWidth={2} aria-hidden="true" />
                  <span className="srOnly"> (opens in a new tab)</span>
                </a>
              )}
              {testimonial.project && project !== testimonial.project && (
                <Link href={`/work/${testimonial.project}`} className={styles.link}>
                  Read the case study <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
                </Link>
              )}
            </div>
          </figcaption>
        </motion.figure>
      </div>
    </section>
  );
};
