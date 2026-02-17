import React from 'react';
import styles from './Products.module.css';

const products = [
  {
    name: 'Ubunifu Insight',
    tagline: 'Document AI for your team',
    description:
      'Upload documents, ask questions in plain language, and get accurate answers with citations. Extract structured data from PDFs, generate reports, and build a searchable knowledge base — all in one place.',
    features: ['RAG-powered Q&A', 'Data extraction', 'Document generation', 'Team workspaces', 'Pay as you go'],
    status: 'live' as const,
    url: 'https://insight.ubunifutech.com',
    domain: 'insight.ubunifutech.com',
  },
  {
    name: 'Ubunifu Rafiki',
    tagline: 'Coming soon',
    description:
      'The next product from Ubunifu Technologies. Built for Tanzania, designed around the tools and workflows your team already uses.',
    features: [],
    status: 'soon' as const,
    url: null,
    domain: 'rafiki.ubunifutech.com',
  },
];

export const Products: React.FC = () => {
  return (
    <section id="products" className={`${styles.section} section-muted`}>
      <div className="container">
        <span className="eyebrow">Our Products</span>
        <h2 className={styles.heading}>Software built for Tanzania</h2>
        <p className={styles.subheading}>
          Each product solves a real problem for African businesses, priced and supported to match local needs.
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
                {product.url ? (
                  <a href={product.url} target="_blank" rel="noopener noreferrer" className={styles.btnLive}>
                    Try Insight
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg>
                  </a>
                ) : (
                  <span className={styles.btnDisabled}>Notify me when it launches</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
