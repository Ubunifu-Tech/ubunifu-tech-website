'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { navLinks } from '@/content/site';
import { BrandLockup } from './BrandMark';
import styles from './Navbar.module.css';

export const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMobileMenuOpen(false);
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isMobileMenuOpen]);

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  // Mark the current page active. Nested routes (e.g. /work/[slug]) light up
  // their top-level link (/work).
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header>
    <nav className={`${styles.navbar} ${scrolled ? styles.scrolled : ''}`} aria-label="Primary navigation">
      <div className="container">
        <div className={styles.shell}>
          <Link href="/" className={styles.logo} onClick={closeMobileMenu} aria-label="Ubunifu Technologies home">
            <BrandLockup />
          </Link>

          <div className={styles.links}>
            {navLinks.map((link) => {
              const active = isActive(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`${styles.link} ${active ? styles.linkActive : ''}`}
                  aria-current={active ? 'page' : undefined}
                >
                  <span className={styles.linkLabel}>{link.label}</span>
                  {link.badge && <span className={styles.badge}>{link.badge}</span>}
                  {active && (
                    <motion.span
                      className={styles.activeIndicator}
                      layoutId="primary-navigation-indicator"
                      transition={
                        reduceMotion
                          ? { duration: 0 }
                          : { type: 'spring', stiffness: 430, damping: 38, mass: 0.55 }
                      }
                      aria-hidden="true"
                    />
                  )}
                </Link>
              );
            })}
          </div>

          <div className={styles.actions}>
            <Link href="/contact" className={styles.cta}>
              Start a project
            </Link>
            <button
              className={`${styles.hamburger} ${isMobileMenuOpen ? styles.active : ''}`}
              onClick={toggleMobileMenu}
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-navigation"
            >
              <span className={styles.bar}></span>
              <span className={styles.bar}></span>
              <span className={styles.bar}></span>
            </button>
          </div>
        </div>
      </div>

      <div id="mobile-navigation" className={`${styles.mobileMenu} ${isMobileMenuOpen ? styles.open : ''}`}>
        <div className={styles.mobileLinks}>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`${styles.mobileLink} ${isActive(link.href) ? styles.mobileLinkActive : ''}`}
              aria-current={isActive(link.href) ? 'page' : undefined}
              onClick={closeMobileMenu}
            >
              {link.label}
              {link.badge && <span className={styles.mobileBadge}>{link.badge}</span>}
            </Link>
          ))}
          <Link href="/contact" className={styles.mobileCta} onClick={closeMobileMenu}>
            Start a project
          </Link>
        </div>
      </div>
    </nav>
    </header>
  );
};
