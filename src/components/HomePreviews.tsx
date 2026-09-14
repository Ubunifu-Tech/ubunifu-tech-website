'use client';

import React from 'react';
import Link from 'next/link';
import { EditorialVisual } from '@/components/EditorialVisual';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { projects } from '@/content/portfolio';
import { MediaReveal } from './MediaReveal';
import styles from './HomePreviews.module.css';

const ease = [0.16, 1, 0.3, 1] as const;

/* ── Work preview ───────────────────────────────
   Plates, not cards. The section directly above this one is a pair of outlined
   cards, and a second pair right underneath read as the same section twice.
   Here the image is the object: no border, no panel, no chrome — a caption sits
   under it the way it would under a plate in a book.

   The capability chips and the full description are gone with the card. The work
   itself is the argument at this size; the case study carries the detail. */

export const WorkPreview: React.FC = () => {
  const reduceMotion = useReducedMotion();

  return (
    <section className={styles.section}>
      <div className="container">
        <motion.div
          className={styles.head}
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: reduceMotion ? 0 : 0.5, ease }}
        >
          <h2 className={styles.heading}>
            Selected <span className={styles.headingAccent}>work</span>
          </h2>
          <p className={styles.sub}>
            Websites and booking systems for two Tanzanian tourism businesses.
          </p>
        </motion.div>

        <div className={styles.plates}>
          {projects.map((project, index) => (
            <motion.div
              key={project.title}
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{
                duration: reduceMotion ? 0 : 0.45,
                delay: reduceMotion ? 0 : index * 0.08,
                ease,
              }}
            >
              <Link href={`/work/${project.slug}`} className={styles.plate}>
                {/* 8/5 matches the diagram's own 640x400 viewBox, so the artwork
                    fills the frame instead of letterboxing inside it. */}
                <div className={styles.plateFrame}>
                  <MediaReveal>
                    <EditorialVisual
                      src={project.artwork.src}
                      alt={project.artwork.alt}
                      fill
                      sizes="(max-width: 860px) 100vw, 560px"
                      className={styles.plateImg}
                    />
                  </MediaReveal>
                </div>
                <p className={styles.plateCat}>{project.category}</p>
                <h3 className={styles.plateTitle}>{project.title}</h3>
                <span className={styles.plateLink}>
                  View case study <ArrowRight size={15} strokeWidth={2.5} />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>

        <Link href="/work" className={styles.link}>
          See all work <ArrowRight size={15} strokeWidth={2.5} />
        </Link>
      </div>
    </section>
  );
};
