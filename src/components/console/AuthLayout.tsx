import React from 'react';
import Link from 'next/link';
import { BrandMark } from '@/components/BrandMark';
import auth from '@/styles/auth.module.css';

/**
 * The entrance, shared by the console and the portal.
 *
 * Both doors look like the same building on purpose. For a client this is the
 * first screen after they have agreed to pay us, so it is worth more than a
 * form on a white page — and since we sell software, our own front door is an
 * argument for the work.
 */
export function AuthLayout({
  role,
  pitch,
  pitchAccent,
  points,
  foot,
  homeHref = '/',
  children,
}: {
  /** "Console" or "Portal", set beside the wordmark. */
  role: string;
  pitch: string;
  pitchAccent: string;
  points: string[];
  foot: string;
  homeHref?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={auth.shell}>
      <aside className={auth.aside}>
        <div className={auth.asideInner}>
          <Link href={homeHref} className={auth.brand}>
            {/* The mark keeps its own colours: the orange U and violet T read
                well on the dark panel, and there is no inverse variant for it. */}
            <BrandMark className={auth.brandMark} title="Ubunifu Technologies" />
            <span className={auth.brandText}>
              Ubunifu <span className={auth.brandRole}>{role}</span>
            </span>
          </Link>
        </div>

        <div>
          <p className={auth.pitch}>
            {pitch} <span className={auth.pitchAccent}>{pitchAccent}</span>
          </p>
          <ul className={auth.points}>
            {points.map((point) => (
              <li key={point} className={auth.point}>
                {point}
              </li>
            ))}
          </ul>
        </div>

        <p className={auth.asideFoot}>{foot}</p>
      </aside>

      <main className={auth.main}>{children}</main>
    </div>
  );
}
