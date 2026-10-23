import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { BrandMark } from '@/components/BrandMark';
import auth from '@/styles/auth.module.css';

/**
 * Sign-in and account setup, for both the console and the portal: the mark and
 * the one thing the person came to do on one side, and on a wide screen the
 * Usambara illustration from the public site on the other, so the page is
 * recognisably ours before anything on it is read.
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
      <div className={auth.side}>
        <Link href={homeHref} className={auth.brand}>
          <BrandMark className={auth.brandMark} title="Ubunifu Technologies" />
          <span className={auth.brandText}>
            Ubunifu <span className={auth.brandRole}>{role}</span>
          </span>
        </Link>
        <div className={auth.body}>{children}</div>
      </div>
      <figure className={auth.art}>
        <Image
          src="/editorial/usambara-landscape-v3.webp"
          alt=""
          fill
          priority
          sizes="(min-width: 64rem) 55vw, 1px"
          className={auth.artImage}
        />
        <figcaption className={auth.artCaption}>Usambara Mountains, Tanga</figcaption>
      </figure>
    </main>
  );
}
