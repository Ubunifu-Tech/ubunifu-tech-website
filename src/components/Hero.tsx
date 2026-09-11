import React from 'react';
import Link from 'next/link';
import { HeroBackdrop } from './HeroBackdrop';
import { cta } from '@/content/site';
import styles from './Hero.module.css';

export const Hero: React.FC = () => {
  return (
    <section className={styles.hero} aria-labelledby="home-hero-title">
      <HeroBackdrop scene="home" align="left" ambient drawn />
      <div className={styles.marquee}>
        <div className={styles.copy}>
          <h1 id="home-hero-title" className={styles.title}>
            Build the system your organisation{' '}
            <span className={styles.titleAccent}>actually needs.</span>
          </h1>

          <div className={styles.supportRow}>
            <p className={styles.subtitle}>
              We help Tanzanian organisations make technology decisions, then
              advise, design, build, host, and support the result. We also build
              and operate software products of our own.
            </p>

            <div className={styles.actions}>
              <Link href="/contact" className={styles.btnPrimary}>
                {cta.primary} <span aria-hidden="true">→</span>
              </Link>
              <Link href="/work" className={styles.btnSecondary}>
                {cta.secondary} <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
