import React from 'react';
import Link from 'next/link';
import { BrandMark } from '@/components/BrandMark';
import auth from '@/styles/auth.module.css';

/**
 * Sign-in and account setup, for both the console and the portal: the mark,
 * and the one thing the person came to do, centred on a quiet page.
 */
export function AuthLayout({
  role,
  homeHref = '/',
  children,
}: {
  /** "Console" or "Portal", set beside the wordmark. */
  role: string;
  homeHref?: string;
  children: React.ReactNode;
}) {
  return (
    <main className={auth.shell}>
      <Link href={homeHref} className={auth.brand}>
        <BrandMark className={auth.brandMark} title="Ubunifu Technologies" />
        <span className={auth.brandText}>
          Ubunifu <span className={auth.brandRole}>{role}</span>
        </span>
      </Link>
      {children}
    </main>
  );
}
