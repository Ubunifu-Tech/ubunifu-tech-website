import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Topography } from './Topography';
import { ScrollReveal } from './ScrollReveal';
import styles from './Spotlight.module.css';

type SpotlightImage = {
  src: string;
  alt: string;
  /** Optional browser-bar domain shown above the image. */
  domain?: string;
};

type SpotlightOverlap = {
  title: string;
  sub?: string;
};

type SpotlightProps = {
  id?: string;
  /** "01"-style marker. */
  index?: number;
  eyebrow?: string;
  title: string;
  body: string;
  items?: string[];
  cta?: { label: string; href: string };
  /** Media on the left instead of the right. */
  reversed?: boolean;
  /** Real screenshot. If omitted, a branded panel is rendered from icon/chips. */
  image?: SpotlightImage;
  /** Brand-tint the image (for atmospheric photos, not product screenshots). */
  tint?: boolean;
  overlap?: SpotlightOverlap;
  /** Fallback branded panel when there's no image. */
  panelIcon?: LucideIcon;
  panelChips?: string[];
};

const Check: React.FC = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const Arrow: React.FC = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
  </svg>
);

export const Spotlight: React.FC<SpotlightProps> = ({
  id,
  index,
  eyebrow,
  title,
  body,
  items,
  cta,
  reversed = false,
  image,
  tint = false,
  overlap,
  panelIcon: PanelIcon,
  panelChips,
}) => {
  return (
    <div id={id} className={`${styles.row} ${reversed ? styles.reversed : ''}`}>
      <ScrollReveal className={styles.text}>
        <div className={styles.heading}>
          {typeof index === 'number' && (
            <span className={styles.index}>{String(index).padStart(2, '0')}</span>
          )}
          <div>
            {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
            <h3 className={styles.title}>{title}</h3>
          </div>
        </div>

        <p className={styles.body}>{body}</p>

        {items && items.length > 0 && (
          <ul className={styles.items}>
            {items.map((item) => (
              <li key={item} className={styles.item}>
                <span className={styles.check}><Check /></span>
                {item}
              </li>
            ))}
          </ul>
        )}

        {cta && (
          <Link href={cta.href} className={styles.cta}>
            {cta.label} <Arrow />
          </Link>
        )}
      </ScrollReveal>

      <ScrollReveal className={styles.media} delay={100}>
        {image ? (
          <div className={styles.frame}>
            {image.domain && (
              <div className={styles.bar}>
                <span className={styles.dot} />
                <span className={styles.dot} />
                <span className={styles.dot} />
                <span className={styles.url}>{image.domain}</span>
              </div>
            )}
            <div className={styles.shotWrap}>
              <Image
                src={image.src}
                alt={image.alt}
                fill
                sizes="(max-width: 900px) 100vw, 540px"
                className={styles.shot}
              />
              {tint && <div className={styles.tint} aria-hidden="true" />}
            </div>
          </div>
        ) : (
          <div className={styles.panel}>
            <Topography className={styles.panelTopo} />
            {PanelIcon && (
              <div className={styles.panelIcon}>
                <PanelIcon size={34} />
              </div>
            )}
            {panelChips && (
              <div className={styles.panelChips}>
                {panelChips.map((chip) => (
                  <span key={chip} className={styles.panelChip}>{chip}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {overlap && (
          <div className={styles.overlap}>
            <p className={styles.overlapTitle}>{overlap.title}</p>
            {overlap.sub && <p className={styles.overlapSub}>{overlap.sub}</p>}
          </div>
        )}
      </ScrollReveal>
    </div>
  );
};
