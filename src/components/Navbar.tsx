'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './Navbar.module.css';

export const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className={`${styles.navbar} ${scrolled ? styles.scrolled : ''}`}>
      <div className={`container ${styles.container}`}>
        <Link href="/" className={styles.logo} onClick={closeMobileMenu}>
          <span className={styles.logoMark}>U</span>
          <span className={styles.logoText}>Ubunifu Technologies</span>
        </Link>

        {/* Desktop Links */}
        <div className={styles.links}>
          <Link href="/#products" className={styles.link}>Products</Link>
          <Link href="/#about" className={styles.link}>About</Link>
          <Link href="/blog" className={styles.link}>Blog</Link>
          <Link href="/careers" className={styles.link}>Careers</Link>
        </div>

        <div className={styles.actions}>
          <a href="https://insight.ubunifutech.com" target="_blank" rel="noopener noreferrer" className={styles.cta}>
            Try Insight
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg>
          </a>

          {/* Hamburger Icon */}
          <button 
            className={`${styles.hamburger} ${isMobileMenuOpen ? styles.active : ''}`} 
            onClick={toggleMobileMenu}
            aria-label="Toggle menu"
          >
            <span className={styles.bar}></span>
            <span className={styles.bar}></span>
            <span className={styles.bar}></span>
          </button>
        </div>

        {/* Mobile Menu Overlay */}
        <div className={`${styles.mobileMenu} ${isMobileMenuOpen ? styles.open : ''}`}>
          <div className={styles.mobileLinks}>
            <Link href="/#products" className={styles.mobileLink} onClick={closeMobileMenu}>Products</Link>
            <Link href="/#about" className={styles.mobileLink} onClick={closeMobileMenu}>About</Link>
            <Link href="/blog" className={styles.mobileLink} onClick={closeMobileMenu}>Blog</Link>
            <Link href="/careers" className={styles.mobileLink} onClick={closeMobileMenu}>Careers</Link>
          </div>
        </div>
      </div>
    </nav>
  );
};
