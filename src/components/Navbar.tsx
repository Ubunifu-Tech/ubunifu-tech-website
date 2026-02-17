'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './Navbar.module.css';

export const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`${styles.navbar} ${scrolled ? styles.scrolled : ''}`}>
      <div className={`container ${styles.container}`}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoMark}>U</span>
          <span className={styles.logoText}>Ubunifu Technologies</span>
        </Link>

        <div className={styles.links}>
          <Link href="/#products" className={styles.link}>Products</Link>
          <Link href="/#portfolio" className={styles.link}>Portfolio</Link>
          <Link href="/#about" className={styles.link}>About</Link>
          <Link href="/blog" className={styles.link}>Blog</Link>
          <Link href="/careers" className={styles.link}>Careers</Link>
        </div>

        <div className={styles.actions}>
          <a href="https://insight.ubunifutech.com" target="_blank" rel="noopener noreferrer" className={styles.cta}>
            Try Insight
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg>
          </a>
        </div>
      </div>
    </nav>
  );
};
