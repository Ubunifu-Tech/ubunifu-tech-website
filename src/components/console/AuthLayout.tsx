import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { BrandMark } from '@/components/BrandMark';
import auth from '@/styles/auth.module.css';

/**
 * The illustration beside the form: the team working through a plan with a
 * client on the portal, and the team building and shipping a site on the
 * console. Both are the public site's own artwork.
 */
const ART: Record<string, string> = {
  Portal: '/editorial/principle-local-v1.webp',
  Console: '/editorial/principle-shipped-v1.webp',
};

/**
 * Sign-in and account setup, for both the console and the portal: the mark and
 * the one thing the person came to do on one side, and on a wide screen one of
 * the site's illustrations on the other, so the page is recognisably ours
 * before anything on it is read.
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
      <div className={auth.art} aria-hidden="true">
        <div className={auth.artFrame}>
          <Image
            src={ART[role] ?? ART.Portal!}
            alt=""
            fill
            priority
            sizes="(min-width: 64rem) 45vw, 1px"
            className={auth.artImage}
          />
        </div>
      </div>
    </main>
  );
}
