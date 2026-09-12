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

/* ── Work preview ─────────────────────────────── */

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

        <div className={styles.workGrid}>
          {projects.map((project, index) => (
            <motion.div
              key={project.title}
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: reduceMotion ? 0 : 0.45, delay: reduceMotion ? 0 : index * 0.08, ease }}
            >
              <Link href={`/work/${project.slug}`} className={styles.workCard}>
                <div className={styles.workThumb}>
                  <MediaReveal>
                    <EditorialVisual
                      src={project.artwork.src}
                      alt={project.artwork.alt}
                      fill
                      sizes="(max-width: 768px) 100vw, 560px"
                      className={styles.workThumbImg}
                    />
                  </MediaReveal>
                </div>
                <div className={styles.workMeta}>
                  <span className={styles.workCat}>{project.category}</span>
                  <h3 className={styles.workTitle}>{project.title}</h3>
                  <p className={styles.workDesc}>{project.description}</p>
                  <div className={styles.workCaps}>
                    {project.capabilities.slice(0, 3).map((cap) => (
                      <span key={cap} className={styles.workCap}>{cap}</span>
                    ))}
                  </div>
                  <span className={styles.workLink}>
                    View case study <ArrowRight size={15} strokeWidth={2.5} />
                  </span>
                </div>
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
