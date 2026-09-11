import React from 'react';
import { HeroBackdrop } from './HeroBackdrop';
import type { HeroScene } from '@/content/hero-scenes';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
  eyebrow: string;
  title: React.ReactNode;
  lead?: string;
  children?: React.ReactNode;
  scene: HeroScene;
  compact?: boolean;
  /** Ambient light layer. On by default wherever a scene backdrop is used. */
  ambient?: boolean;
}

/**
 * Page header. The entrance is a CSS animation, not Framer Motion: this block
 * holds every page's <h1> above the fold, so it must be painted and readable
 * before (and without) hydration. `animation-fill-mode: both` supplies the
 * from-state, and the global prefers-reduced-motion reset neutralises it.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  eyebrow,
  title,
  lead,
  children,
  scene,
  compact = false,
  ambient = true,
}) => {
  return (
    <header className={`${styles.header} ${styles.withArtwork} ${styles.scene} ${compact ? styles.compact : ''}`}>
      <HeroBackdrop scene={scene} ambient={ambient} />
      <div className={styles.inner}>
        <div className={styles.topline}>
          <span>{eyebrow}</span>
        </div>

        <h1 className={styles.title}>{title}</h1>

        <div className={styles.supportRow}>
          {lead && <p className={styles.lead}>{lead}</p>}

          {children && <div className={styles.actions}>{children}</div>}
        </div>
      </div>
    </header>
  );
};
