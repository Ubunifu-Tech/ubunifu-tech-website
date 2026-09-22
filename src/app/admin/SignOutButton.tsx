'use client';

import React from 'react';
import styles from './Admin.module.css';

/**
 * POST, not a link. A sign-out reachable by GET can be triggered by any image
 * tag on any page the staff member happens to open.
 */
export function SignOutButton({ action }: { action: string }) {
  return (
    <form method="post" action={action}>
      <button type="submit" className={styles.signOut}>
        Sign out
      </button>
    </form>
  );
}
