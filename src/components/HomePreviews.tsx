'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { services } from '@/content/services';
import { sectors } from '@/content/sectors';
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

/* ── Services preview ─────────────────────────── */

export const ServicesPreview: React.FC = () => {
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
          <span className="eyebrow">What we do</span>
          <h2 className={styles.heading}>Six connected capabilities</h2>
          <p className={styles.sub}>
            From the public experience to the data and infrastructure behind it,
            we shape the parts as one working system.
          </p>
        </motion.div>

        <motion.div
          className={styles.serviceFeature}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease }}
        >
          <div className={styles.serviceFeatureMedia}>
            <Image
              src="/editorial/software-tanzania-learning.webp"
              alt="Tactile workbench where research cards, modular pieces, and revision loops lead to one working assembly"
              fill
              sizes="(max-width: 900px) 100vw, 560px"
              className={styles.serviceFeatureImg}
            />
          </div>
          <div className={styles.serviceFeatureCopy}>
            <p className={styles.serviceFeatureLabel}>One team, the whole digital side</p>
            <h3 className={styles.serviceFeatureTitle}>Strategy, design, build, hosting, and support under one roof.</h3>
            <p className={styles.serviceFeatureText}>
              Most projects need more than a website. They need the brand, the
              infrastructure, the data, and the support model to work together.
            </p>
          </div>
        </motion.div>

        <div className={styles.serviceGrid}>
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <motion.div
                key={service.key}
                className={styles.serviceCard}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.45, delay: index * 0.06, ease }}
              >
                <div className={styles.serviceIcon}>
                  <Icon size={22} />
                </div>
                <h3 className={styles.serviceTitle}>{service.title}</h3>
                <p className={styles.serviceSummary}>{service.summary}</p>
              </motion.div>
            );
          })}

          {/* Trailing CTA — spans the full grid width as a banner */}
          <motion.div
            className={`${styles.serviceCard} ${styles.serviceCta}`}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.45, delay: services.length * 0.06, ease }}
          >
            <p className={styles.serviceCtaText}>
              Need more than one? That&apos;s the usual &mdash; most clients
              combine a few.
            </p>
            <Link href="/build" className={styles.serviceCtaLink}>
              Explore all services <Arrow />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

/* ── Sectors strip ────────────────────────────── */

export const SectorsStrip: React.FC = () => {
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
          <span className="eyebrow">Who we serve</span>
          <h2 className={styles.heading}>Built for organisations across Tanzania</h2>
          <p className={styles.sub}>
            We work across sectors. Our shipped work is in tourism so far, and
            we&apos;re equipped for the rest.
          </p>
        </motion.div>

        <div className={styles.sectorGrid}>
          {sectors.map((sector, index) => {
            const Icon = sector.icon;
            return (
              <motion.div
                key={sector.label}
                className={styles.sectorTile}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: index * 0.04, ease }}
              >
                <span className={styles.sectorIcon}>
                  <Icon size={20} />
                </span>
                <span className={styles.sectorLabel}>{sector.label}</span>
              </motion.div>
            );
          })}
        </div>

        <Link href="/industries" className={styles.link}>
          See how we help each sector <Arrow />
        </Link>
      </div>
    </section>
  );
};

/* ── Work preview ─────────────────────────────── */

export const WorkPreview: React.FC = () => {
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
          <span className="eyebrow">Selected work</span>
          <h2 className={styles.heading}>Systems running in the real world</h2>
          <p className={styles.sub}>
            Two Tanzanian tourism businesses. Two very different operating
            systems. Both shaped around what happens after a visitor clicks.
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

/* ── Products as proof ────────────────────────── */

export const ProductsProof: React.FC = () => {
  const suite = products.filter((p) => p.status === 'live' || p.status === 'soon');

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
          <span className="eyebrow">Product studio</span>
          <h2 className={styles.heading}>Products shaped by the same work</h2>
          <p className={styles.sub}>
            Insight and Sifa are live. Rafiki is the next product in the family.
            Each starts with a workflow we believe deserves a better tool.
          </p>
        </motion.div>

        <div className={styles.proofGrid}>
          {suite.map((product, index) => {
            const isExternal = Boolean(product.url?.startsWith('http'));
            const href = product.url ?? '/products';

            return (
            <motion.a
              key={product.name}
              href={href}
              target={isExternal ? '_blank' : undefined}
              rel={isExternal ? 'noopener noreferrer' : undefined}
              className={styles.proofCard}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.45, delay: index * 0.08, ease }}
            >
              {product.primary ? (
                <div className={styles.proofThumb}>
                  <Image
                    src={product.primary.src}
                    alt={product.primary.alt}
                    fill
                    sizes="(max-width: 768px) 100vw, 560px"
                    className={styles.proofThumbImg}
                  />
                  <span className={styles.proofBadge}>
                    <span className={styles.proofDot} />
                    Live
                  </span>
                </div>
              ) : (
                <div className={`${styles.proofThumb} ${styles.proofPlaceholder}`}>
                  <span className={styles.proofPlaceholderName}>Rafiki</span>
                  <span className={styles.proofBadge}>In development</span>
                </div>
              )}
              <div className={styles.proofMeta}>
                <span className={styles.proofName}>{product.name}</span>
                <p className={styles.proofTagline}>{product.tagline}</p>
                <span className={styles.workLink}>
                  {product.status === 'live' ? `Visit ${product.domain}` : 'Preview the product family'} <Arrow />
                </span>
              </div>
            </motion.a>
          )})}
        </div>
        <Link href="/products" className={styles.link}>
          Explore all products <Arrow />
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
          <h2 className={styles.heading}>A digital partner that gets the local context</h2>
          <p className={styles.aboutText}>
            We&apos;re a small, senior team in Arusha, helping organisations across
            Tanzania build, run, and grow their digital side. Deep technical skill,
            a real read of the market, and no handoffs.
          </p>
          <Link href="/about" className={styles.link}>
            More about the team <Arrow />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};
