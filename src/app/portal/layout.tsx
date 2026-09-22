import React from 'react';
import type { Metadata } from 'next';
import styles from './Portal.module.css';

/**
 * The client portal shell.
 *
 * Sits outside the (site) group deliberately: a client opening a signing link
 * or an invoice should land in their portal, not in a marketing page with a
 * "Start a project" button. It is also not indexed — every page behind it is
 * somebody's private project.
 */
export const metadata: Metadata = {
  title: { default: 'Your portal · Ubunifu', template: '%s · Ubunifu portal' },
  robots: { index: false, follow: false, nocache: true },
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <div className={styles.shell}>{children}</div>;
}
