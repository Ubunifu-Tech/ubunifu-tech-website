'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { products } from '@/content/products';
import styles from './Products.module.css';

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

        <div className={styles.bento}>
          {products.map((product, index) => (
            <motion.div
              key={product.name}
              className={`${styles.card} ${styles[product.size]} ${product.status === 'soon' ? styles.cardSoon : ''} ${product.primary ? styles.cardWithImage : ''}`}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className={styles.cardGlow} aria-hidden="true" />

              {product.primary && (
                <div className={styles.screenshotFrame}>
                  <Image
                    src={product.primary.src}
                    alt={product.primary.alt}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 50vw"
                    className={styles.screenshot}
                  />
                </div>
              )}

              <div className={styles.cardInner}>
                <div className={styles.cardTop}>
                  <div className={styles.cardHeader}>
                    <div>
                      <p className={styles.productName}>{product.name}</p>
                      <p className={styles.domain}>{product.domain}</p>
                    </div>
                    {product.status === 'live' ? (
                      <span className={styles.badgeLive}>
                        <span className={styles.badgeDot} />
                        Live
                      </span>
                    ) : product.status === 'available' ? (
                      <span className={styles.badgeLive}>
                        <span className={styles.badgeDot} />
                        Available
                      </span>
                    ) : (
                      <span className={styles.badgeSoon}>Coming soon</span>
                    )}
                  </div>

                  <p className={styles.tagline}>{product.tagline}</p>
                  <p className={styles.description}>{product.description}</p>

                  <ul className={styles.features}>
                    {product.features.map((f) => (
                      <li key={f} className={styles.feature}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className={styles.cardFooter}>
                  {product.status === 'live' && product.url ? (
                    <a href={product.url} target="_blank" rel="noopener noreferrer" className={styles.btnLive}>
                      {product.cta}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg>
                    </a>
                  ) : product.status === 'available' && product.url ? (
                    <Link href={product.url} className={styles.btnLive}>
                      {product.cta}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
                    </Link>
                  ) : (
                    <span className={styles.btnDisabled}>{product.cta}</span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
