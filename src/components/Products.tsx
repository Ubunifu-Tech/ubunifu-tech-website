'use client';

import React from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { products } from '@/content/products';
import styles from './Products.module.css';

const ArrowOut: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17L17 7" /><path d="M7 7h10v10" /></svg>
);

const ArrowRight: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></svg>
);

export const Products: React.FC<{ hideHeader?: boolean }> = ({
  hideHeader = false,
}) => {
  const reduceMotion = Boolean(useReducedMotion());

  return (
    <section
      id="products"
      className={`section ${styles.section}`}
      aria-labelledby="products-title"
    >
      <div className="container">
        {!hideHeader && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: reduceMotion ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="eyebrow">What we offer</span>
            <h2 id="products-title" className={styles.heading}>Software products</h2>
            <p className={styles.subheading}>
              Two live products for defined workflows, plus consulting when the
              problem needs a system shaped around your organisation.
            </p>
          </motion.div>
        )}
        {hideHeader && (
          <h2 id="products-title" className={styles.visuallyHidden}>Ubunifu products</h2>
        )}

        <div className={styles.ledger}>
          {products.map((product, index) => (
            <motion.article
              key={product.name}
              className={styles.product}
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: reduceMotion ? 0 : 0.5, delay: reduceMotion ? 0 : index * 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              <header className={styles.identity}>
                <div className={styles.topline}>
                  <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                  <span
                    className={`${styles.status} ${product.status === 'live' ? styles.statusLive : ''}`}
                  >
                    {product.status === 'live'
                      ? 'Live'
                      : product.status === 'available'
                        ? 'Available'
                        : 'In development'}
                  </span>
                </div>
                <h3 className={styles.name}>{product.name}</h3>
                <p className={styles.domain}>{product.domain}</p>
              </header>

              <div className={styles.body}>
                <p className={styles.tagline}>{product.tagline}</p>
                <p className={styles.description}>{product.description}</p>
              </div>

              <div className={styles.capabilities}>
                <p>What it supports</p>
                <ul className={styles.features}>
                  {product.features.map((feature, featureIndex) => (
                    <li key={feature} className={styles.feature}>
                      <span>{String(featureIndex + 1).padStart(2, '0')}</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <footer className={styles.footer}>
                {product.status === 'live' && product.url ? (
                  <a href={product.url} target="_blank" rel="noopener noreferrer" className={styles.link}>
                    {product.cta} <ArrowOut />
                    <span className="srOnly"> (opens in a new tab)</span>
                  </a>
                ) : product.status === 'available' && product.url ? (
                  <Link href={product.url} className={styles.link}>
                    {product.cta} <ArrowRight />
                  </Link>
                ) : (
                  <span className={styles.unavailable}>{product.cta}</span>
                )}
              </footer>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
};
