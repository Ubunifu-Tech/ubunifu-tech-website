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
            SaaS products and consulting - each built for how businesses in
            Tanzania actually work.
          </p>
        </motion.div>

        <div className={styles.productGrid}>
          {products.map((product, index) => (
            <motion.div
              key={product.name}
              className={styles.miniCard}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.45, delay: index * 0.07, ease }}
            >
              <div className={styles.miniTop}>
                <span className={styles.miniName}>{product.name}</span>
                <span
                  className={`${styles.status} ${
                    product.status === 'live'
                      ? styles.statusLive
                      : product.status === 'available'
                        ? styles.statusAvailable
                        : styles.statusSoon
                  }`}
                >
                  {product.status === 'live'
                    ? 'Live'
                    : product.status === 'available'
                      ? 'Available'
                      : 'Soon'}
                </span>
              </div>
              <p className={styles.miniTagline}>{product.tagline}</p>
            </motion.div>
          ))}
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
          <span className="eyebrow">Our work</span>
          <h2 className={styles.heading}>Recent client work</h2>
          <p className={styles.sub}>
            Websites and platforms we have designed and built for businesses
            across Tanzania.
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
              <Link href="/work" className={styles.workCard}>
                <div
                  className={styles.workLogo}
                  style={{ background: project.logoBg }}
                >
                  <Image
                    src={project.logo}
                    alt={`${project.title} logo`}
                    fill
                    sizes="140px"
                    className={styles.workLogoImg}
                    style={{ objectFit: 'contain' }}
                  />
                </div>
                <div className={styles.workMeta}>
                  <span className={styles.workCat}>{project.category}</span>
                  <span className={styles.workTitle}>{project.title}</span>
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
          <h2 className={styles.heading}>A small team building for Africa</h2>
          <p className={styles.aboutText}>
            Ubunifu Technologies is a small, focused team in Arusha, Tanzania -
            building software products and consulting for African businesses,
            starting from how this market actually works rather than adapting
            tools made elsewhere.
          </p>
          <Link href="/about" className={styles.link}>
            More about the team <Arrow />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};
