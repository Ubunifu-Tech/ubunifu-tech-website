'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { products } from '@/content/products';
import { Topography } from './Topography';
import styles from './Products.module.css';

const ArrowOut: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7" /><path d="M7 7h10v10" /></svg>
);

const ArrowRight: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></svg>
);

export const Products: React.FC<{ hideHeader?: boolean }> = ({
  hideHeader = false,
}) => {
  return (
    <section id="products" className={`section ${styles.section}`}>
      <div className="container">
        {!hideHeader && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="eyebrow">What we offer</span>
            <h2 className={styles.heading}>Products &amp; services</h2>
            <p className={styles.subheading}>
              Two live SaaS products you can use today, plus consulting when you need a
              custom build.
            </p>
          </motion.div>
        )}

        <div className={styles.grid}>
          {products.map((product, index) => (
            <motion.article
              key={product.name}
              className={`${styles.card} ${product.status === 'soon' ? styles.cardSoon : ''}`}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Media panel — real screenshot, or a branded panel when there isn't one */}
              <div className={styles.media}>
                {product.primary ? (
                  <Image
                    src={product.primary.src}
                    alt={product.primary.alt}
                    fill
                    sizes="(max-width: 768px) 100vw, 560px"
                    className={styles.shot}
                  />
                ) : (
                  <div className={styles.placeholder} aria-hidden="true">
                    <Topography className={styles.placeholderTopo} />
                    <span className={styles.placeholderMark}>
                      {product.name.replace('Ubunifu ', '')}
                    </span>
                  </div>
                )}
                <span
                  className={`${styles.badge} ${
                    product.status === 'soon' ? styles.badgeSoon : styles.badgeLive
                  }`}
                >
                  {product.status !== 'soon' && <span className={styles.badgeDot} />}
                  {product.status === 'live'
                    ? 'Live'
                    : product.status === 'available'
                      ? 'Available'
                      : 'Coming soon'}
                </span>
              </div>

              <div className={styles.body}>
                <div className={styles.head}>
                  <p className={styles.name}>{product.name}</p>
                  <p className={styles.domain}>{product.domain}</p>
                </div>

                <p className={styles.tagline}>{product.tagline}</p>
                <p className={styles.description}>{product.description}</p>

                <ul className={styles.features}>
                  {product.features.map((f) => (
                    <li key={f} className={styles.feature}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>

                <div className={styles.footer}>
                  {product.status === 'live' && product.url ? (
                    <a href={product.url} target="_blank" rel="noopener noreferrer" className={styles.btn}>
                      {product.cta} <ArrowOut />
                    </a>
                  ) : product.status === 'available' && product.url ? (
                    <Link href={product.url} className={styles.btn}>
                      {product.cta} <ArrowRight />
                    </Link>
                  ) : (
                    <span className={styles.btnDisabled}>{product.cta}</span>
                  )}
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
};
