'use client';

import React from 'react';
import Link from 'next/link';
import { EditorialVisual } from '@/components/EditorialVisual';
import { motion, useReducedMotion } from 'framer-motion';
import { products } from '@/content/products';
import { projects } from '@/content/portfolio';
import { MediaReveal } from './MediaReveal';
import styles from './HomePreviews.module.css';

const ease = [0.16, 1, 0.3, 1] as const;

const Arrow: React.FC = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14" />
    <path d="M12 5l7 7-7 7" />
  </svg>
);

const ArrowOut: React.FC = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 17 17 7" />
    <path d="M7 7h10v10" />
  </svg>
);

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
          <h2 className={styles.heading}>Selected work</h2>
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
                    View case study <Arrow />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <Link href="/work" className={styles.link}>
          See all work <Arrow />
        </Link>
      </div>
    </section>
  );
};

/* ── Products as proof ────────────────────────── */

export const ProductsProof: React.FC = () => {
  const suite = products.filter((p) => p.status === 'live' || p.status === 'soon');
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
          <h2 className={styles.heading}>Our products</h2>
          <p className={styles.sub}>
            Software we build, operate, and continue to improve.
          </p>
        </motion.div>

        <div className={styles.productProofLayout}>
          <div className={styles.proofGrid}>
            {suite.map((product, index) => {
              const isExternal = Boolean(product.url?.startsWith('http'));
              const href = product.url ?? '/products';
              const status = product.status === 'live' ? 'Live' : 'In development';

              return (
                <motion.a
                  key={product.name}
                  href={href}
                  target={isExternal ? '_blank' : undefined}
                  rel={isExternal ? 'noopener noreferrer' : undefined}
                  className={styles.proofCard}
                  initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: reduceMotion ? 0 : 0.45, delay: reduceMotion ? 0 : index * 0.08, ease }}
                >
                  <div className={styles.proofMeta}>
                    <span className={styles.proofStatus}>{status}</span>
                    <h3 className={styles.proofName}>{product.name}</h3>
                    <span className={styles.proofTagline}>{product.tagline}</span>
                  </div>
                  <span className={styles.proofAction}>
                    {product.status === 'live' ? `Visit ${product.domain}` : 'View product details'}
                    {isExternal ? <ArrowOut /> : <Arrow />}
                    {isExternal && <span className="srOnly"> (opens in a new tab)</span>}
                  </span>
                </motion.a>
              );
            })}
          </div>
        </div>
        <Link href="/products" className={styles.link}>
          Explore all products <Arrow />
        </Link>
      </div>
    </section>
  );
};
