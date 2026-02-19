'use client';

import React, { useState } from 'react';
import Link from 'next/link';
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
  },
  {
    name: 'Ubunifu Rafiki',
    tagline: 'Business tools for your website',
    description:
      'Embeddable widgets that give any Tanzanian business a professional online presence — contact forms, booking systems, and blog tools that just work.',
    features: ['Contact forms', 'Booking widgets', 'Blog tools', 'Built for Tanzania'],
    status: 'soon' as const,
    url: null,
    domain: 'rafiki.ubunifutech.com',
  },
  {
    name: 'Ubunifu Build',
    tagline: 'Custom software & consulting',
    description:
      'We design and build websites, data solutions, and digital strategy for businesses that need hands-on expertise. From a single landing page to a full platform.',
    features: ['Web development', 'Data analytics', 'Brand design', 'AI & automation'],
    status: 'available' as const,
    url: '/build',
    domain: 'ubunifutech.com/build',
  },
];

export const Products: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      console.log('Rafiki interest:', email);
      // TODO: Connect to actual email service
      setSubmitted(true);
      setEmail('');
    }
  };

  return (
    <section id="products" className={`${styles.section} section-muted`}>
      <div className="container">
        <span className="eyebrow">What we offer</span>
        <h2 className={styles.heading}>Products and services</h2>
        <p className={styles.subheading}>
          SaaS products and consulting — each designed for how businesses in Tanzania actually work.
        </p>

        <div className={styles.grid}>
          {products.map((product) => (
            <div key={product.name} className={`${styles.card} ${product.status === 'soon' ? styles.cardSoon : ''}`}>
              <div className={styles.cardTop}>
                <div className={styles.cardHeader}>
                  <div>
                    <p className={styles.productName}>{product.name}</p>
                    <p className={styles.domain}>{product.domain}</p>
                  </div>
                  {product.status === 'live' ? (
                    <span className={styles.badgeLive}>Live</span>
                  ) : product.status === 'available' ? (
                    <span className={styles.badgeLive}>Available</span>
                  ) : (
                    <span className={styles.badgeSoon}>Coming soon</span>
                  )}
                </div>

                <p className={styles.tagline}>{product.tagline}</p>
                <p className={styles.description}>{product.description}</p>

                {product.features.length > 0 && (
                  <ul className={styles.features}>
                    {product.features.map((f) => (
                      <li key={f} className={styles.feature}>
                        <span className={styles.featureDot} />
                        {f}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className={styles.cardFooter}>
                {product.status === 'live' && product.url ? (
                  <a href={product.url} target="_blank" rel="noopener noreferrer" className={styles.btnLive}>
                    Try Insight
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg>
                  </a>
                ) : product.status === 'available' && product.url ? (
                  <Link href={product.url} className={styles.btnLive}>
                    Learn more
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
                  </Link>
                ) : (
                  <div className={styles.emailCapture}>
                    {submitted ? (
                      <p className={styles.successMessage}>Thanks! We'll keep you posted.</p>
                    ) : (
                      <form onSubmit={handleSubmit} className={styles.form}>
                        <input
                          type="email"
                          placeholder="Enter your email"
                          className={styles.input}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                        <button type="submit" className={styles.btnNotify}>
                          Notify me
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
