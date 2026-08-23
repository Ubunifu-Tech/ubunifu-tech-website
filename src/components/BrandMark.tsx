import React, { useId } from 'react';
import styles from './BrandMark.module.css';

type BrandMarkProps = {
  className?: string;
  title?: string;
};

/**
 * The Ubunifu Ligature: an orange U and a purple T meet as one engineered
 * glyph. The rising T crown gives the mark forward motion while the shared
 * lower junction keeps the two initials visibly connected.
 */
export const BrandMark: React.FC<BrandMarkProps> = ({ className = '', title }) => {
  const titleId = useId();

  return (
    <svg
      className={`${styles.mark} ${className}`}
      viewBox="0 0 64 64"
      role={title ? 'img' : undefined}
      aria-labelledby={title ? titleId : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title && <title id={titleId}>{title}</title>}
      <path
        d="M11 17v18c0 13 8 20 20 20 7 0 11-2 13-5"
        fill="none"
        stroke="var(--brand)"
        strokeWidth="10"
        strokeLinecap="square"
        strokeLinejoin="round"
      />
      <path
        d="M43 13v23c0 11 6 18 14 18"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="10"
        strokeLinecap="square"
        strokeLinejoin="round"
      />
      <path
        d="M29 16 57 10"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="10"
        strokeLinecap="square"
        strokeLinejoin="round"
      />
    </svg>
  );
};

type BrandLockupProps = {
  className?: string;
  inverse?: boolean;
};

export const BrandLockup: React.FC<BrandLockupProps> = ({
  className = '',
  inverse = false,
}) => (
  <span
    className={`${styles.lockup} ${inverse ? styles.inverse : ''} ${className}`}
  >
    <BrandMark className={styles.lockupMark} />
    <span className={styles.wordmark}>
      <span className={styles.name}>Ubunifu</span>
      <span className={styles.descriptor}>Technologies</span>
    </span>
  </span>
);
