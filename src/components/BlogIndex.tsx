'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Topography } from './Topography';
import styles from '../app/blog/Blog.module.css';

export type PostMeta = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  author: string;
  tags: string[];
  readingTime: number;
};

// Curated filters. A post matches if its tags include the filter.
const FILTERS = ['All', 'Product', 'Consulting', 'AI', 'Tanzania'] as const;

const ease = [0.16, 1, 0.3, 1] as const;

function formatDate(date: string): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function num(n: number): string {
  return String(n).padStart(2, '0');
}

const ReadMore: React.FC = () => (
  <span className={styles.readMore}>
    Read article
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
    </svg>
  </span>
);

const FeaturedCard: React.FC<{ post: PostMeta }> = ({ post }) => (
  <Link href={`/blog/${post.slug}`} className={styles.featured}>
    <div className={styles.featuredBody}>
      <div className={styles.metaRow}>
        <span className={styles.category}>{post.tags[0] ?? 'Notes'}</span>
        <span className={styles.metaDot} />
        <span>{formatDate(post.date)}</span>
        <span className={styles.metaDot} />
        <span>{post.readingTime} min read</span>
      </div>
      <h2 className={styles.featuredTitle}>{post.title}</h2>
      <p className={styles.featuredExcerpt}>{post.excerpt}</p>
      <div className={styles.featuredFooter}>
        <span className={styles.author}>{post.author}</span>
        <ReadMore />
      </div>
    </div>
    <div className={styles.featuredVisual} aria-hidden="true">
      <span className={`aurora ${styles.featuredAurora}`} />
      <Topography className={styles.featuredTopo} />
      <span className={styles.featuredIndex}>01</span>
      <span className={styles.featuredKicker}>Latest</span>
    </div>
  </Link>
);

const PostCard: React.FC<{ post: PostMeta; index: number }> = ({ post, index }) => (
  <Link href={`/blog/${post.slug}`} className={styles.card}>
    <div className={styles.cardTop}>
      <span className={styles.cardIndex}>{num(index)}</span>
      <span className={styles.category}>{post.tags[0] ?? 'Notes'}</span>
    </div>
    <h3 className={styles.cardTitle}>{post.title}</h3>
    <p className={styles.excerpt}>{post.excerpt}</p>
    <div className={styles.cardFooter}>
      <span className={styles.metaSmall}>
        {formatDate(post.date)} · {post.readingTime} min
      </span>
      <ReadMore />
    </div>
  </Link>
);

export const BlogIndex: React.FC<{ posts: PostMeta[] }> = ({ posts }) => {
  const [active, setActive] = useState<string>('All');

  const available = useMemo(
    () => FILTERS.filter((f) => f === 'All' || posts.some((p) => p.tags.includes(f))),
    [posts],
  );

  const isAll = active === 'All';
  const featured = isAll ? posts[0] : null;
  const grid = isAll ? posts.slice(1) : posts.filter((p) => p.tags.includes(active));

  return (
    <>
      <div className={styles.filters} role="tablist" aria-label="Filter posts by topic">
        {available.map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={active === f}
            onClick={() => setActive(f)}
            className={`${styles.filter} ${active === f ? styles.filterActive : ''}`}
          >
            {f}
          </button>
        ))}
      </div>

      {featured && <FeaturedCard post={featured} />}

      <motion.div layout className={styles.grid}>
        <AnimatePresence mode="popLayout">
          {grid.map((post, i) => (
            <motion.div
              layout
              key={post.slug}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease }}
            >
              <PostCard post={post} index={isAll ? i + 2 : i + 1} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {grid.length === 0 && !featured && (
        <p className={styles.empty}>No posts under “{active}” yet — check back soon.</p>
      )}
    </>
  );
};
