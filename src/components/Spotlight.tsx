import React from 'react';
import { EditorialVisual } from './EditorialVisual';
import Link from 'next/link';
import { ArrowRight, Check, type LucideIcon } from 'lucide-react';
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
  /** Load eagerly when this image is expected to be the page LCP. */
  priority?: boolean;
  /** Brand-tint the image (for atmospheric photos, not product screenshots). */
  tint?: boolean;
  overlap?: SpotlightOverlap;
  /** Fallback branded panel when there's no image. */
  panelIcon?: LucideIcon;
  panelChips?: string[];
  /** Heading level for the title, so callers keep a correct document outline. */
  headingLevel?: 2 | 3;
};

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
  priority = false,
  tint = false,
  overlap,
  panelIcon: PanelIcon,
  panelChips,
  headingLevel = 3,
}) => {
  const Title = headingLevel === 2 ? 'h2' : 'h3';

  return (
    <div id={id} className={`${styles.row} ${reversed ? styles.reversed : ''}`}>
      <ScrollReveal className={styles.text}>
        <div className={styles.heading}>
          {typeof index === 'number' && (
            <span className={styles.index}>{String(index).padStart(2, '0')}</span>
          )}
          <div>
            {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
            <Title id={id ? `${id}-title` : undefined} className={styles.title}>
              {title}
            </Title>
          </div>
        </div>

        <p className={styles.body}>{body}</p>

        {items && items.length > 0 && (
          <ul className={styles.items}>
            {items.map((item) => (
              <li key={item} className={styles.item}>
                <span className={styles.check}><Check size={13} strokeWidth={3} aria-hidden="true" /></span>
                {item}
              </li>
            ))}
          </ul>
        )}

        {cta && (
          <Link href={cta.href} className={styles.cta}>
            {cta.label} <ArrowRight size={15} strokeWidth={2.5} aria-hidden="true" />
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
              <EditorialVisual
                src={image.src}
                alt={image.alt}
                fill
                priority={priority}
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
