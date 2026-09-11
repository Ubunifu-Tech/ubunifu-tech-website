'use client';

import React from 'react';
import Link from 'next/link';
import { EditorialVisual } from '@/components/EditorialVisual';
import { motion, useReducedMotion } from 'framer-motion';
import { MediaReveal } from './MediaReveal';
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

function formatDate(date: string): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

const Arrow: React.FC = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
  </svg>
);

export const Insights: React.FC<{ posts: InsightPost[] }> = ({ posts }) => {
  const reduceMotion = useReducedMotion();

  if (!posts.length) return null;

  const [lead, ...dispatches] = posts;

  return (
    <section className={styles.section}>
      <div className="container">
        <motion.div
          className={styles.head}
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: reduceMotion ? 0 : 0.5, ease }}
        >
          <div>
            <h2 className={styles.heading}>Articles</h2>
          </div>
          <Link href="/blog" className={styles.headLink}>
            All articles <Arrow />
          </Link>
        </motion.div>

        <div className={styles.editorialGrid}>
          <motion.div
            className={styles.leadWrap}
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: reduceMotion ? 0 : 0.5, ease }}
          >
            <Link href={`/blog/${lead.slug}`} className={styles.leadStory}>
              {lead.coverImage && lead.coverAlt ? (
                <div className={styles.leadMedia}>
                  <MediaReveal>
                    <EditorialVisual
                      src={lead.coverImage}
                      alt={lead.coverAlt}
                      fill
                      sizes="(max-width: 900px) 100vw, 760px"
                      className={styles.image}
                    />
                  </MediaReveal>
                </div>
              ) : null}
              <div className={styles.leadBody}>
                <div className={styles.meta}>
                  <time dateTime={lead.date}>{formatDate(lead.date)}</time>
                  {lead.tags[0] && <span className={styles.tag}>{lead.tags[0]}</span>}
                </div>
                <h3 className={styles.leadTitle}>{lead.title}</h3>
                <p className={styles.excerpt}>{lead.excerpt}</p>
                <span className={styles.readMore}>Read article <Arrow /></span>
              </div>
            </Link>
          </motion.div>

          <ul className={styles.dispatches}>
          {dispatches.map((post, index) => (
            <motion.li
              className={styles.dispatchItem}
              key={post.slug}
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: reduceMotion ? 0 : 0.42, delay: reduceMotion ? 0 : index * 0.07, ease }}
            >
              <Link href={`/blog/${post.slug}`} className={styles.dispatch}>
                <div className={styles.dispatchCopy}>
                  <div className={styles.meta}>
                    <time dateTime={post.date}>{formatDate(post.date)}</time>
                    {post.tags[0] && <span className={styles.tag}>{post.tags[0]}</span>}
                  </div>
                  <h3 className={styles.title}>{post.title}</h3>
                  <p className={styles.excerpt}>{post.excerpt}</p>
                  <span className={styles.readMore}>Read article <Arrow /></span>
                </div>
              </Link>
            </motion.li>
          ))}
          </ul>
        </div>
      </div>
    </section>
  );
};
