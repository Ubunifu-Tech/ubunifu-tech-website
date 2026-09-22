'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { BrandMark } from '@/components/BrandMark';
import { ConsoleNav, type NavCounts } from './ConsoleNav';
import styles from './Admin.module.css';

/**
 * The sidebar, on a phone: a menu button in the top bar that slides the same
 * navigation in from the left. It closes itself when a page opens.
 */
export function MobileNav({ counts }: { counts: NavCounts }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [shownFor, setShownFor] = useState(pathname);

  // A new page closes the drawer. Done while rendering rather than in an
  // effect, so the drawer never paints over the page it just opened.
  if (shownFor !== pathname) {
    setShownFor(pathname);
    if (open) setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={styles.menuButton}
        onClick={() => setOpen(true)}
        aria-label="Open the menu"
        aria-expanded={open}
        aria-controls="console-drawer"
      >
        <Menu size={20} strokeWidth={1.8} aria-hidden="true" />
      </button>
      <Link href="/" className={styles.topBrand}>
        <BrandMark className={styles.brandMark} title="Ubunifu Technologies" />
      </Link>

      {open && (
        <div className={styles.drawerBackdrop} onClick={() => setOpen(false)}>
          <aside
            id="console-drawer"
            className={styles.drawer}
            aria-label="Menu"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.drawerHead}>
              <Link href="/" className={styles.brand}>
                <BrandMark className={styles.brandMark} title="Ubunifu Technologies" />
                <span className={styles.brandText}>
                  Ubunifu <span className={styles.brandRole}>Console</span>
                </span>
              </Link>
              <button
                type="button"
                className={styles.menuButton}
                onClick={() => setOpen(false)}
                aria-label="Close the menu"
              >
                <X size={20} strokeWidth={1.8} aria-hidden="true" />
              </button>
            </div>
            <ConsoleNav counts={counts} />
          </aside>
        </div>
      )}
    </>
  );
}
