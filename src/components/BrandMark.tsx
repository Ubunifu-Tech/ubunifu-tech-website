import React, { useId } from 'react';
import { brandMarkPaths } from '@/lib/brand';
import styles from './BrandMark.module.css';

type BrandMarkProps = {
  className?: string;
  title?: string;
  variant?: 'default' | 'inverse';
};

/**
 * The Ubunifu Ligature: an orange U and a violet T meet as one engineered
 * glyph. The angled T crown gives the original mark its forward motion.
 */
export const BrandMark: React.FC<BrandMarkProps> = ({
  className = '',
  title,
  variant = 'default',
}) => {
  const titleId = useId();

  return (
    <svg
      className={`${styles.mark} ${styles[variant]} ${className}`}
      viewBox="0 0 64 64"
      role={title ? 'img' : undefined}
      aria-labelledby={title ? titleId : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title && <title id={titleId}>{title}</title>}
      <path className={styles.u} d={brandMarkPaths.u} />
      <path className={styles.t} d={brandMarkPaths.tStem} />
      <path className={styles.t} d={brandMarkPaths.tCrown} />
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
    <BrandMark className={styles.lockupMark} variant={inverse ? 'inverse' : 'default'} />
    <span className={styles.wordmark}>
      <span className={styles.name}>Ubunifu</span>
      <span className={styles.technology}>Technologies</span>
    </span>
  </span>
);
