'use client';

import React from 'react';
import Link from 'next/link';
import { EditorialVisual } from '@/components/EditorialVisual';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { products } from '@/content/products';
import { projects } from '@/content/portfolio';
import { MediaReveal } from './MediaReveal';
import styles from './HomePreviews.module.css';

const ease = [0.16, 1, 0.3, 1] as const;

/* ── Work preview ───────────────────────────────
   Plates, not cards. The section directly above this one is a pair of outlined
   cards, and a second pair right underneath read as the same section twice.
   Here the image is the object: no border, no panel, no chrome — a caption sits
   under it the way it would under a plate in a book.

   The capability chips and the full description are gone with the card. The work
   itself is the argument at this size; the case study carries the detail. */

export const WorkPreview: React.FC = () => {
  const reduceMotion = useReducedMotion();

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
          <h2 className={styles.heading}>
            Selected <span className={styles.headingAccent}>work</span>
          </h2>
          <p className={styles.sub}>
            Websites and booking systems for two Tanzanian tourism businesses.
          </p>
        </motion.div>

        <div className={styles.plates}>
          {projects.map((project, index) => (
            <motion.div
              key={project.title}
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{
                duration: reduceMotion ? 0 : 0.45,
                delay: reduceMotion ? 0 : index * 0.08,
                ease,
              }}
            >
              <Link href={`/work/${project.slug}`} className={styles.plate}>
                {/* 8/5 matches the diagram's own 640x400 viewBox, so the artwork
                    fills the frame instead of letterboxing inside it. */}
                <div className={styles.plateFrame}>
                  <MediaReveal>
                    <EditorialVisual
                      src={project.artwork.src}
                      alt={project.artwork.alt}
                      fill
                      sizes="(max-width: 860px) 100vw, 560px"
                      className={styles.plateImg}
                    />
                  </MediaReveal>
                </div>
                <p className={styles.plateCat}>{project.category}</p>
                <h3 className={styles.plateTitle}>{project.title}</h3>
                <span className={styles.plateLink}>
                  View case study <ArrowRight size={15} strokeWidth={2.5} />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>

        <Link href="/work" className={styles.link}>
          See all work <ArrowRight size={15} strokeWidth={2.5} />
        </Link>
      </div>
    </section>
  );
};

/* ── Products as proof ──────────────────────────
   Deliberately not another equal card grid — the page already has two of those.
   Hierarchy here comes from real data rather than from preference: what is
   running gets the weight, and what is not is visibly a different tier.
   Each live product carries a filled tint in its own hue, a device used nowhere
   else on the site, so this section is not mistaken for the one above it. */

const HUES = ['insight', 'sifa'] as const;

export const ProductsProof: React.FC = () => {
  const live = products.filter((p) => p.status === 'live');
  const upcoming = products.filter((p) => p.status !== 'live');
  const reduceMotion = useReducedMotion();

  return (
    <section className={`${styles.section} ${styles.altBg}`}>
      <div className="container">
        <motion.div
          className={styles.head}
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: reduceMotion ? 0 : 0.5, ease }}
        >
          <h2 className={styles.heading}>
            Our <span className={styles.headingAccent}>products</span>
          </h2>
          <p className={styles.sub}>
            Software we build, operate, and continue to improve.
          </p>
        </motion.div>

        <div className={styles.liveShelf}>
          {live.map((product, index) => (
            <motion.a
              key={product.name}
              href={product.url ?? '/products'}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.liveCard}
              data-hue={HUES[index] ?? 'insight'}
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{
                duration: reduceMotion ? 0 : 0.45,
                delay: reduceMotion ? 0 : index * 0.08,
                ease,
              }}
            >
              <span className={styles.liveBadge}>
                <span className={styles.liveDot} aria-hidden="true" />
                Live
              </span>
              <h3 className={styles.liveName}>{product.name}</h3>
              <p className={styles.liveTagline}>{product.tagline}</p>
              <span className={styles.liveAddress}>
                {product.domain}
                <ArrowUpRight size={16} strokeWidth={2.5} aria-hidden="true" />
                <span className="srOnly"> (opens in a new tab)</span>
              </span>
            </motion.a>
          ))}
        </div>

        {/* A quieter tier on purpose: it is not something anyone can use yet. */}
        {upcoming.map((product) => (
          <Link key={product.name} href="/products" className={styles.upcoming}>
            <span className={styles.upcomingStatus}>In development</span>
            <span className={styles.upcomingName}>{product.name}</span>
            <span className={styles.upcomingTagline}>{product.tagline}</span>
            <span className={styles.upcomingAction} aria-hidden="true">
              →
            </span>
          </Link>
        ))}

        <Link href="/products" className={styles.link}>
          Explore all products <ArrowRight size={15} strokeWidth={2.5} />
        </Link>
      </div>
    </section>
  );
};
