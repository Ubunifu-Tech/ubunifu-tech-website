'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import styles from './Products.module.css';

const products = [
  {
    name: 'Ubunifu Insight',
    tagline: 'Document AI for your team',
    description:
      'Upload documents, ask questions in plain language, and get accurate answers with citations. Extract structured data, generate reports, and build a searchable knowledge base.',
    features: ['RAG-powered Q&A', 'Data extraction', 'Document generation', 'Team workspaces', 'Pay as you go'],
    status: 'live' as const,
    url: 'https://insight.ubunifutech.com',
    domain: 'insight.ubunifutech.com',
    cta: 'Try Insight',
    size: 'featured' as const,
    accent: 'emerald' as const,
  },
  {
    name: 'Ubunifu Sifa',
    tagline: 'Business management for Tanzanian SMBs',
    description:
      'Sales, inventory, employee management, and real-time reports — all in one platform. Works offline on any phone.',
    features: ['Sales & POS', 'Inventory tracking', 'Employee scheduling', 'Credit management', 'Free plan available'],
    status: 'live' as const,
    url: 'https://sifa.ubunifutech.com',
    domain: 'sifa.ubunifutech.com',
    cta: 'Start Free',
    size: 'wide' as const,
    accent: 'teal' as const,
  },
  {
    name: 'Ubunifu Rafiki',
    tagline: 'Business tools for your website',
    description:
      'Embeddable widgets — contact forms, booking systems, and blog tools for any business.',
    features: ['Contact forms', 'Booking widgets', 'Blog tools'],
    status: 'soon' as const,
    url: null,
    domain: 'rafiki.ubunifutech.com',
    cta: 'Coming soon',
    size: 'default' as const,
    accent: 'indigo' as const,
  },
  {
    name: 'Ubunifu Build',
    tagline: 'Custom software & consulting',
    description:
      'Websites, data solutions, and digital strategy — from a single page to a full platform.',
    features: ['Web development', 'Data analytics', 'Brand design', 'AI & automation'],
    status: 'available' as const,
    url: '/build',
    domain: 'ubunifutech.com/build',
    cta: 'Learn more',
    size: 'default' as const,
    accent: 'emerald' as const,
  },
];

export const Products: React.FC = () => {
  return (
    <section id="products" className={`section ${styles.section}`}>
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="eyebrow">What we offer</span>
          <h2 className={styles.heading}>Products &amp; services</h2>
          <p className={styles.subheading}>
            SaaS products and consulting — each built for how businesses in Tanzania actually work.
          </p>
        </motion.div>

        <div className={styles.bento}>
          {products.map((product, index) => (
            <motion.div
              key={product.name}
              className={`${styles.card} ${styles[product.size]} ${product.status === 'soon' ? styles.cardSoon : ''}`}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className={styles.cardGlow} aria-hidden="true" />
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
