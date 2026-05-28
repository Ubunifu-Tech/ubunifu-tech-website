'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { navLinks } from '@/content/site';
import styles from './Navbar.module.css';

export const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <nav className={`${styles.navbar} ${scrolled ? styles.scrolled : ''}`}>
      <div className={`container ${styles.container}`}>
        <Link href="/" className={styles.logo} onClick={closeMobileMenu}>
          <span className={styles.logoMark}>U</span>
          <span className={styles.logoText}>
            <span className={styles.logoName}>Ubunifu</span><span className={styles.logoAccent}>Technologies</span>
          </span>
        </Link>

        <div className={styles.links}>
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className={styles.link}>
              {link.label}
              {link.badge && <span className={styles.badge}>{link.badge}</span>}
            </Link>
          ))}
        </div>

        <div className={styles.actions}>
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

        <div className={`${styles.mobileMenu} ${isMobileMenuOpen ? styles.open : ''}`}>
          <div className={styles.mobileLinks}>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={styles.mobileLink}
                onClick={closeMobileMenu}
              >
                {link.label}
                {link.badge && <span className={styles.mobileBadge}>{link.badge}</span>}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};
