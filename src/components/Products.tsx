'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { products } from '@/content/products';
import { productArtwork } from '@/content/product-artwork';
import styles from './Products.module.css';

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
            <h2 id="products-title" className={styles.heading}>
              Software <span className={styles.headingAccent}>products</span>
            </h2>
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
          {products.map((product, index) => {
            const artwork = productArtwork[product.id];
            return (
              <motion.article
                key={product.id}
                data-product={product.id}
                className={`${styles.product} ${artwork ? styles.withArtwork : ''}`}
                initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: reduceMotion ? 0 : 0.5, delay: reduceMotion ? 0 : index * 0.08, ease: [0.16, 1, 0.3, 1] }}
              >
                {artwork && (
                  <div className={styles.visual} data-product-art={product.id}>
                    <Image
                      src={artwork.src}
                      alt={artwork.alt}
                      fill
                      sizes="(max-width: 900px) 94vw, (max-width: 1440px) 44vw, 640px"
                      className={styles.image}
                    />
                  </div>
                )}
                <header className={styles.identity}>
                  <div className={styles.topline}>
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
                  {/* Only print an address that actually answers. rafiki.ubunifutech.com
                      does not resolve yet, and showing it undercuts the two that do. */}
                  {product.status !== 'soon' && (
                    <p className={styles.domain}>{product.domain}</p>
                  )}
                </header>

                <div className={styles.body}>
                  <p className={styles.tagline}>{product.tagline}</p>
                  <p className={styles.description}>{product.description}</p>
                </div>

                <div className={styles.capabilities}>
                  <ul className={styles.features} aria-label={`${product.name} features`}>
                    {product.features.map((feature) => (
                      <li key={feature} className={styles.feature}>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <footer className={styles.footer}>
                  {product.status === 'live' && product.url ? (
                    <a href={product.url} target="_blank" rel="noopener noreferrer" className={styles.link}>
                      {product.cta} <ArrowUpRight size={14} strokeWidth={2.5} aria-hidden="true" />
                      <span className="srOnly"> (opens in a new tab)</span>
                    </a>
                  ) : product.status === 'available' && product.url ? (
                    <Link href={product.url} className={styles.link}>
                      {product.cta} <ArrowRight size={14} strokeWidth={2.5} aria-hidden="true" />
                    </Link>
                  ) : (
                    <span className={styles.unavailable}>{product.cta}</span>
                  )}
                </footer>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
