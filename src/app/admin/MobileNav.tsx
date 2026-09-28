'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { BrandMark } from '@/components/BrandMark';
import { Modal } from '@/components/console/Modal';
import { ConsoleNav, type NavCounts } from './ConsoleNav';
import type { Permission } from '@/lib/console/permissions';
import styles from './Admin.module.css';

/**
 * The sidebar, on a phone: a menu button in the top bar that slides the same
 * navigation in from the left, as a modal dialog. It closes itself when a
 * page opens, and focus goes back to the menu button.
 */
export function MobileNav({
  counts,
  permissions,
}: {
  counts: NavCounts;
  permissions: readonly Permission[];
}) {
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const [shownFor, setShownFor] = useState(pathname);

  // A new page closes the drawer. Done while rendering rather than in an
  // effect, so the drawer never paints over the page it just opened.
  if (shownFor !== pathname) {
    setShownFor(pathname);
    if (open) setOpen(false);
  }

  return (
    <>
      <button
        ref={menuButton}
        type="button"
        className={styles.menuButton}
        onClick={() => setOpen(true)}
        aria-label="Open the menu"
        aria-expanded={open}
        aria-controls={open ? 'console-drawer' : undefined}
      >
        <Menu size={20} strokeWidth={1.8} aria-hidden="true" />
      </button>

      {open && (
        <Modal
          id="console-drawer"
          label="Menu"
          placement="start"
          className={styles.drawer}
          onClose={() => setOpen(false)}
          returnFocus={() => menuButton.current}
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
              data-autofocus
            >
              <X size={20} strokeWidth={1.8} aria-hidden="true" />
            </button>
          </div>
          <ConsoleNav counts={counts} permissions={permissions} />
        </Modal>
      )}
    </>
  );
}
