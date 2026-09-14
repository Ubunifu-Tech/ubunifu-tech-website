import React from 'react';
import { PageSceneGraphic, type PageScene } from './PageSceneGraphic';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
  eyebrow: string;
  title: React.ReactNode;
  lead?: string;
  children?: React.ReactNode;
  scene: PageScene;
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
}) => {
  return (
    <header className={styles.header} data-page-header={scene}>
      <div className={styles.inner}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1 className={styles.title}>{title}</h1>
          {lead && <p className={styles.lead}>{lead}</p>}
          {children && <div className={styles.actions}>{children}</div>}
        </div>
        <div className={styles.visual}>
          <PageSceneGraphic scene={scene} />
        </div>
      </div>
    </header>
  );
};
