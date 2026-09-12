'use client';

import React from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { formatDateShort } from '@/lib/date';
import styles from './Insights.module.css';

const ease = [0.16, 1, 0.3, 1] as const;

type InsightPost = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  tags: string[];
  coverImage?: string;
  coverAlt?: string;
};

const Arrow: React.FC = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5 12h14" />
    <path d="M12 5l7 7-7 7" />
  </svg>
);

/**
 * A ruled index, deliberately without pictures.
 *
 * This is the last section before the CTA band, and by the time a reader reaches
 * it they have already passed the work plates, a dark quote and two tinted
 * product panels. Another set of image cards here would be the fourth picture
 * block in a row and the page would end on noise. Set as a dated index it reads
 * as a decrescendo — quiet, typographic, and obviously a different kind of thing
 * from everything above it.
 *
 * The covers are not lost: /blog leads with them, which is where someone
 * browsing articles actually goes.
 *
 * The date sits in its own column so the three rows scan as a list of dispatches
 * rather than three paragraphs that happen to be stacked.
 */
export const Insights: React.FC<{ posts: InsightPost[] }> = ({ posts }) => {
  const reduceMotion = useReducedMotion();

  if (!posts.length) return null;

  return (
    <section className={styles.section} aria-labelledby="insights-title">
      <div className="container">
        <motion.div
          className={styles.head}
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: reduceMotion ? 0 : 0.5, ease }}
        >
          <h2 id="insights-title" className={styles.heading}>
            Recent <span className={styles.headingAccent}>writing</span>
          </h2>
          <Link href="/blog" className={styles.headLink}>
            All articles <Arrow />
          </Link>
        </motion.div>

        <ul className={styles.index}>
          {posts.map((post, i) => (
            <motion.li
              key={post.slug}
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{
                duration: reduceMotion ? 0 : 0.42,
                delay: reduceMotion ? 0 : i * 0.06,
                ease,
              }}
            >
              <Link href={`/blog/${post.slug}`} className={styles.entry}>
                <div className={styles.stamp}>
                  <time dateTime={post.date}>{formatDateShort(post.date)}</time>
                  {post.tags[0] && <span className={styles.tag}>{post.tags[0]}</span>}
                </div>
                <div className={styles.read}>
                  <h3 className={styles.title}>{post.title}</h3>
                  <p className={styles.excerpt}>{post.excerpt}</p>
                </div>
                <span className={styles.arrow} aria-hidden="true">
                  <Arrow />
                </span>
              </Link>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
};
