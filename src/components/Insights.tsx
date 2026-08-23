'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
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
  if (!posts.length) return null;

  return (
    <section className={styles.section}>
      <div className="container">
        <motion.div
          className={styles.head}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease }}
        >
          <div>
            <span className="eyebrow">Latest thinking</span>
            <h2 className={styles.heading}>Notes from the work</h2>
          </div>
          <Link href="/blog" className={styles.headLink}>
            Read the blog <Arrow />
          </Link>
        </motion.div>

        <div className={styles.grid}>
          {posts.map((post, index) => (
            <motion.div
              key={post.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.45, delay: index * 0.07, ease }}
            >
              <Link href={`/blog/${post.slug}`} className={styles.card}>
                {post.coverImage && post.coverAlt ? (
                  <div className={styles.media}>
                    <Image
                      src={post.coverImage}
                      alt={post.coverAlt}
                      fill
                      sizes="(max-width: 900px) 100vw, 390px"
                      className={styles.image}
                    />
                  </div>
                ) : null}
                <div className={styles.body}>
                  <div className={styles.meta}>
                    <span className={styles.date}>{formatDate(post.date)}</span>
                    {post.tags[0] && <span className={styles.tag}>{post.tags[0]}</span>}
                  </div>
                  <h3 className={styles.title}>{post.title}</h3>
                  <p className={styles.excerpt}>{post.excerpt}</p>
                  <span className={styles.readMore}>
                    Read article <Arrow />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
