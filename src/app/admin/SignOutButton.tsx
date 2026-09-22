'use client';

import React from 'react';
import { LogOut } from 'lucide-react';
import styles from './Admin.module.css';

/**
 * POST, not a link. A sign-out reachable by GET can be triggered by any image
 * tag on any page the staff member happens to open.
 */
export function SignOutButton({ action }: { action: string }) {
  return (
    <form method="post" action={action}>
      <button type="submit" className={styles.signOut}>
        <LogOut size={17} strokeWidth={1.8} className={styles.navIcon} aria-hidden="true" />
        <span className={styles.navText}>Sign out</span>
      </button>
    </form>
  );
}
