import React from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { projects } from '@/content/portfolio';
import { sectionId } from '@/lib/slug';
import { EditorialVisual } from './EditorialVisual';
import { MediaReveal } from './MediaReveal';
import { ScrollReveal } from './ScrollReveal';
import styles from './WorkRegister.module.css';

/**
 * The /work register: one long entry per project on a hairline-ruled list.
 *
 * Two decisions worth keeping:
 *
 * The live domain is the PRIMARY action, above the case-study link. These are real
 * running sites and the fastest way to be believed is to send someone to one. The
 * previous card treated the live link as a footnote.
 *
 * The plate is framed at 8/5 because that is the diagram's own viewBox (640x400).
 * The old 16/9 frame made the SVG letterbox to roughly 43% fill with `meet`; at 8/5
 * it draws edge to edge.
 */

export function WorkRegister() {
  return (
    <ol className={styles.list}>
      {projects.map((project, i) => (
        <li key={project.slug} className={styles.entry}>
          <ScrollReveal className={styles.read}>
            <h2 className={styles.title}>
              <Link href={`/work/${project.slug}`} className={styles.titleLink}>
                {project.title}
              </Link>
            </h2>

            <p className={styles.description}>{project.description}</p>

            <div className={styles.contents}>
              <p className={styles.contentsLabel}>In the case study</p>
              <ul className={styles.contentsList}>
                {project.highlights.map((highlight) => (
                  <li key={highlight.title}>
                    <Link
                      href={`/work/${project.slug}#${sectionId(highlight.title)}`}
                      className={styles.contentsLink}
                    >
                      {highlight.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.actions}>
              <a
                href={project.link}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.liveLink}
              >
                <span className="srOnly">Visit </span>
                {project.domain}
                <ArrowUpRight size={18} aria-hidden="true" />
                <span className="srOnly"> (opens in a new tab)</span>
              </a>
              <Link href={`/work/${project.slug}`} className={styles.caseLink}>
                Read the case study <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
              </Link>
            </div>
          </ScrollReveal>

          <figure className={styles.figure}>
            {/* The plate must be the positioned ancestor: MediaReveal is inset:0. */}
            <div className={styles.plate}>
              <MediaReveal>
                <EditorialVisual
                  src={project.artwork.src}
                  // Empty alt makes EditorialVisual render the diagram aria-hidden,
                  // so the caption below is not read out twice.
                  alt=""
                  fill
                  sizes="(max-width: 980px) calc(100vw - 2.5rem), 720px"
                  className={styles.plateArt}
                  priority={i === 0}
                />
              </MediaReveal>
            </div>
            {/* Sibling of .plate, not a child — inside it the caption gets clipped. */}
            <figcaption className={styles.caption}>{project.artwork.alt}</figcaption>
          </figure>
        </li>
      ))}
    </ol>
  );
}
