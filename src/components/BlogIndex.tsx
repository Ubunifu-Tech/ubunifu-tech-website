'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { BlogPostMeta } from '@/lib/blog';
import styles from '../app/blog/Blog.module.css';

export type PostMeta = Omit<BlogPostMeta, 'coverImage' | 'coverAlt'> & {
  coverImage: string;
  coverAlt: string;
};

// A post matches a topic when its frontmatter tags include the same label.
const FILTERS = ['All', 'Product', 'Consulting', 'AI', 'Tanzania'] as const;
const ease = [0.16, 1, 0.3, 1] as const;
const shortDate = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

function formatDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? date : shortDate.format(parsed);
}

function num(value: number): string {
  return String(value).padStart(2, '0');
}

function Arrow() {
  return (
    <svg
      aria-hidden="true"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5l7 7-7 7" />
    </svg>
  );
}

function ReadMore() {
  return (
    <span className={styles.readMore}>
      Read article
      <Arrow />
    </span>
  );
}

function FeaturedCard({ post }: { post: PostMeta }) {
  return (
    <Link href={`/blog/${post.slug}`} className={styles.featured}>
      <div className={styles.featuredVisual}>
        <Image
          src={post.coverImage}
          alt={post.coverAlt}
          fill
          priority
          sizes="(max-width: 860px) 100vw, (max-width: 1280px) 52vw, 650px"
          className={styles.featuredImage}
        />
        <span className={styles.featuredShade} aria-hidden="true" />
        <span className={styles.featuredKicker}>Latest story</span>
      </div>

      <div className={styles.featuredBody}>
        <div className={styles.metaRow}>
          <span className={styles.category}>{post.tags[0] ?? 'Field notes'}</span>
          <span className={styles.metaDot} aria-hidden="true" />
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          <span className={styles.metaDot} aria-hidden="true" />
          <span>{post.readingTime} min read</span>
        </div>
        <h2 className={styles.featuredTitle}>{post.title}</h2>
        <p className={styles.featuredExcerpt}>{post.excerpt}</p>
        <div className={styles.featuredFooter}>
          <span className={styles.author}>{post.author}</span>
          <ReadMore />
        </div>
      </div>
    </Link>
  );
}

function PostCard({ post, index }: { post: PostMeta; index: number }) {
  return (
    <Link href={`/blog/${post.slug}`} className={styles.card}>
      <div className={styles.cardVisual}>
        <Image
          src={post.coverImage}
          alt={post.coverAlt}
          fill
          sizes="(max-width: 760px) 100vw, (max-width: 1120px) 50vw, 390px"
          className={styles.cardImage}
        />
        <span className={styles.cardIndex}>{num(index)}</span>
      </div>

      <div className={styles.cardBody}>
        <div className={styles.cardTop}>
          <span className={styles.category}>{post.tags[0] ?? 'Field notes'}</span>
          <span className={styles.metaSmall}>
            <time dateTime={post.date}>{formatDate(post.date)}</time>
          </span>
        </div>
        <h3 className={styles.cardTitle}>{post.title}</h3>
        <p className={styles.excerpt}>{post.excerpt}</p>
        <div className={styles.cardFooter}>
          <span className={styles.metaSmall}>{post.readingTime} min read</span>
          <ReadMore />
        </div>
      </div>
    </Link>
  );
}

export function BlogIndex({ posts }: { posts: PostMeta[] }) {
  const [active, setActive] = useState<(typeof FILTERS)[number]>('All');
  const reduceMotion = useReducedMotion();

  const available = useMemo(
    () => FILTERS.filter((filter) => (
      filter === 'All' || posts.some((post) => post.tags.includes(filter))
    )),
    [posts],
  );

  const isAll = active === 'All';
  const filtered = useMemo(
    () => (isAll ? posts : posts.filter((post) => post.tags.includes(active))),
    [active, isAll, posts],
  );
  const featured = isAll ? filtered[0] : undefined;
  const grid = featured ? filtered.slice(1) : filtered;
  const resultLabel = `${filtered.length} ${filtered.length === 1 ? 'article' : 'articles'}`;

  return (
    <>
      <div className={styles.filterBar}>
        <fieldset className={styles.filters}>
          <legend className={styles.filterLegend}>Filter journal articles by topic</legend>
          {available.map((filter) => (
            <button
              key={filter}
              type="button"
              aria-pressed={active === filter}
              onClick={() => setActive(filter)}
              className={`${styles.filter} ${active === filter ? styles.filterActive : ''}`}
            >
              {filter}
            </button>
          ))}
        </fieldset>
        <p className={styles.resultCount} aria-live="polite">
          {resultLabel}
        </p>
      </div>

      {featured ? <FeaturedCard post={featured} /> : null}

      <motion.div layout={!reduceMotion} className={styles.grid}>
        <AnimatePresence mode="popLayout" initial={false}>
          {grid.map((post, index) => (
            <motion.div
              layout={!reduceMotion}
              key={post.slug}
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: reduceMotion ? 0 : 0.32, ease }}
            >
              <PostCard post={post} index={isAll ? index + 2 : index + 1} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {filtered.length === 0 ? (
        <p className={styles.empty}>No posts under “{active}” yet. Check back soon.</p>
      ) : null}
    </>
  );
}
