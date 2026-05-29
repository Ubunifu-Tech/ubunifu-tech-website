'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { products } from '@/content/products';
import { projects } from '@/content/portfolio';
import styles from './HomePreviews.module.css';

const ease = [0.16, 1, 0.3, 1] as const;

const Arrow: React.FC = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14" />
    <path d="M12 5l7 7-7 7" />
  </svg>
);

const Check: React.FC = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

function statusLabel(status: string): string {
  return status === 'live' ? 'Live' : status === 'available' ? 'Available' : 'Soon';
}

/* ── Products preview ─────────────────────────── */

export const ProductsPreview: React.FC = () => {
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
          <span className="eyebrow">What we offer</span>
          <h2 className={styles.heading}>Products &amp; services</h2>
          <p className={styles.sub}>
            Two live SaaS products you can use today, one on the way, and custom
            builds when an off-the-shelf tool won&apos;t cut it.
          </p>
        </motion.div>

        <div className={styles.productGrid}>
          {products.map((product, index) => {
            const isLink = Boolean(product.url);
            const external = product.url?.startsWith('http');
            const inner = (
              <>
                <div className={styles.miniTop}>
                  <div>
                    <p className={styles.miniName}>{product.name}</p>
                    <p className={styles.miniDomain}>{product.domain}</p>
                  </div>
                  <span
                    className={`${styles.status} ${
                      product.status === 'live'
                        ? styles.statusLive
                        : product.status === 'available'
                          ? styles.statusAvailable
                          : styles.statusSoon
                    }`}
                  >
                    {statusLabel(product.status)}
                  </span>
                </div>

                <p className={styles.miniTagline}>{product.tagline}</p>
                <p className={styles.miniDesc}>{product.description}</p>

                <ul className={styles.miniFeatures}>
                  {product.features.slice(0, 3).map((f) => (
                    <li key={f} className={styles.miniFeature}>
                      <span className={styles.miniCheck}><Check /></span>
                      {f}
                    </li>
                  ))}
                </ul>

                {isLink && (
                  <span className={styles.miniLink}>
                    {product.cta} <Arrow />
                  </span>
                )}
              </>
            );

            return (
              <motion.div
                key={product.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.45, delay: index * 0.07, ease }}
              >
                {external ? (
                  <a
                    href={product.url as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${styles.miniCard} ${product.status === 'soon' ? styles.miniCardSoon : ''}`}
                  >
                    {inner}
                  </a>
                ) : isLink ? (
                  <Link
                    href={product.url as string}
                    className={`${styles.miniCard} ${product.status === 'soon' ? styles.miniCardSoon : ''}`}
                  >
                    {inner}
                  </Link>
                ) : (
                  <div className={`${styles.miniCard} ${styles.miniCardSoon}`}>{inner}</div>
                )}
              </motion.div>
            );
          })}
        </div>

        <Link href="/products" className={styles.link}>
          Explore all products <Arrow />
        </Link>
      </div>
    </section>
  );
};

/* ── Work preview ─────────────────────────────── */

export const WorkPreview: React.FC = () => {
  return (
    <section className={`${styles.section} ${styles.altBg}`}>
      <div className="container">
        <motion.div
          className={styles.head}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease }}
        >
          <span className="eyebrow">Selected work</span>
          <h2 className={styles.heading}>Built for clients, in production</h2>
          <p className={styles.sub}>
            Platforms and sites we&apos;ve shipped for businesses across Tanzania,
            built by the same team behind our products.
          </p>
        </motion.div>

        <div className={styles.workGrid}>
          {projects.map((project, index) => (
            <motion.div
              key={project.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.45, delay: index * 0.08, ease }}
            >
              <Link href={`/work/${project.slug}`} className={styles.workCard}>
                <div className={styles.workThumb}>
                  <Image
                    src={project.primary.src}
                    alt={project.primary.alt}
                    fill
                    sizes="(max-width: 768px) 100vw, 560px"
                    className={styles.workThumbImg}
                  />
                </div>
                <div className={styles.workMeta}>
                  <span className={styles.workCat}>{project.category}</span>
                  <span className={styles.workTitle}>{project.title}</span>
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

/* ── About preview ────────────────────────────── */

export const AboutPreview: React.FC = () => {
  return (
    <section className={styles.section}>
      <div className="container">
        <motion.div
          className={styles.aboutInner}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease }}
        >
          <span className="eyebrow">About</span>
          <h2 className={styles.heading}>A small team building from Arusha</h2>
          <p className={styles.aboutText}>
            We&apos;re a small, focused team in Arusha, Tanzania. We ship our own
            SaaS products and take on custom builds for African businesses,
            starting from the workflows that exist here.
          </p>
          <Link href="/about" className={styles.link}>
            More about the team <Arrow />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};
