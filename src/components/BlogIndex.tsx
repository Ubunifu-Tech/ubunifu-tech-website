'use client';

import { useMemo, useState } from 'react';
import { EditorialVisual } from '@/components/EditorialVisual';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import type { BlogPostMeta } from '@/lib/blog';
import { formatDateShort } from '@/lib/date';
import styles from '../app/(site)/blog/Blog.module.css';

export type PostMeta = Omit<BlogPostMeta, 'coverImage' | 'coverAlt'> & {
  coverImage: string;
  coverAlt: string;
};

// A post matches a topic when its frontmatter tags include the same label.
const FILTERS = ['All', 'Product', 'Consulting', 'AI', 'Tanzania'] as const;
const ease = [0.16, 1, 0.3, 1] as const;

function ReadMore() {
  return (
    <span className={styles.readMore}>
      Read article
      <ArrowRight size={15} strokeWidth={2.5} aria-hidden="true" />
    </span>
  );
}

function FeaturedCard({ post }: { post: PostMeta }) {
  return (
    <Link href={`/blog/${post.slug}`} className={styles.featured}>
      <div className={styles.featuredVisual}>
        <EditorialVisual
          src={post.coverImage}
          alt={post.coverAlt}
          fill
          priority
          sizes="(max-width: 860px) 100vw, (max-width: 1280px) 52vw, 650px"
          className={styles.featuredImage}
        />
      </div>

      <div className={styles.featuredBody}>
        <div className={styles.metaRow}>
          <span className={styles.category}>{post.tags[0] ?? 'Field notes'}</span>
          <span className={styles.metaDot} aria-hidden="true" />
          <time dateTime={post.date}>{formatDateShort(post.date)}</time>
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

/**
 * A row, not a card. The lead above already spends a full-width frame on one
 * cover; repeating that shape six more times gave every remaining article the
 * same weight as the one before it and turned the archive into a wall of
 * pictures. A compact thumbnail beside the copy keeps the covers, scales past
 * seven posts, and reads as an archive rather than a gallery.
 */
function PostRow({ post }: { post: PostMeta }) {
  return (
    <Link href={`/blog/${post.slug}`} className={styles.row}>
      <div className={styles.rowVisual}>
        <EditorialVisual
          src={post.coverImage}
          alt={post.coverAlt}
          fill
          sizes="(max-width: 760px) 100vw, 220px"
          className={styles.cardImage}
        />
      </div>

      <div className={styles.rowBody}>
        <div className={styles.rowTop}>
          <span className={styles.category}>{post.tags[0] ?? 'Field notes'}</span>
          <span className={styles.metaSmall}>
            <time dateTime={post.date}>{formatDateShort(post.date)}</time>
            {' · '}
            {post.readingTime} min read
          </span>
        </div>
        <h3 className={styles.rowTitle}>{post.title}</h3>
        <p className={styles.excerpt}>{post.excerpt}</p>
        <ReadMore />
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
          <legend className={styles.filterLegend}>Filter insights by topic</legend>
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
          {grid.map((post) => (
            <motion.div
              layout={!reduceMotion}
              key={post.slug}
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: reduceMotion ? 0 : 0.32, ease }}
            >
              <PostRow post={post} />
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
