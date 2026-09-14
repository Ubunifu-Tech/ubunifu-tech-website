'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, X } from 'lucide-react';
import { navLinks, cta } from '@/content/site';
import { BrandLockup } from './BrandMark';
import styles from './Navbar.module.css';

export const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const menuNode = menuRef.current;
    const focusable = () => Array.from(
      menuNode?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? [],
    );

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
        window.requestAnimationFrame(() => menuButtonRef.current?.focus());
        return;
      }

      if (event.key !== 'Tab') return;
      const items = focusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    const focusFrame = window.requestAnimationFrame(() => {
      menuNode?.querySelector<HTMLElement>('a[href]')?.focus();
    });

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
      if (previousFocus && menuNode?.contains(document.activeElement)) previousFocus.focus();
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1051px)');
    const closeAtDesktop = (event: MediaQueryListEvent | MediaQueryList) => {
      if (event.matches) setIsMobileMenuOpen(false);
    };

    closeAtDesktop(desktop);
    desktop.addEventListener('change', closeAtDesktop);
    return () => desktop.removeEventListener('change', closeAtDesktop);
  }, []);

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
                  <span>{link.label}</span>
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
              {cta.primary}
              <ArrowRight aria-hidden="true" size={17} strokeWidth={1.9} />
            </Link>
            <button
              ref={menuButtonRef}
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

      <div
        ref={menuRef}
        id="mobile-navigation"
        data-lenis-prevent
        className={`${styles.mobileMenu} ${isMobileMenuOpen ? styles.open : ''}`}
        role={isMobileMenuOpen ? 'dialog' : undefined}
        aria-modal={isMobileMenuOpen || undefined}
        aria-label={isMobileMenuOpen ? 'Mobile navigation' : undefined}
        aria-hidden={!isMobileMenuOpen}
      >
        <button
          type="button"
          className={styles.mobileClose}
          onClick={closeMobileMenu}
          aria-label="Close menu"
        >
          <X aria-hidden="true" size={28} strokeWidth={1.8} />
        </button>
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
            {cta.primary}
            <ArrowRight aria-hidden="true" size={19} strokeWidth={1.9} />
          </Link>
        </div>
      </div>
    </nav>
    </header>
  );
};
