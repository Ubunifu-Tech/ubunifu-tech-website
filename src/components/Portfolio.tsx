'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ExternalLink, ArrowRight } from 'lucide-react';
import { projects } from '@/content/portfolio';
import { MediaReveal } from './MediaReveal';
import styles from './Portfolio.module.css';

const ease = [0.16, 1, 0.3, 1] as const;

export const Portfolio: React.FC<{ hideHeader?: boolean }> = ({
  hideHeader = false,
}) => {
  const reduceMotion = useReducedMotion();

  return (
    <section id="portfolio" className={`section ${styles.portfolio}`}>
      <div className="container">
        {!hideHeader && (
          <motion.div
            className={styles.header}
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: reduceMotion ? 0 : 0.5, ease }}
          >
            <span className="eyebrow">Selected work</span>
            <h2 className={styles.heading}>What the delivered work supports</h2>
            <p className={styles.subheading}>
              Client systems described through the situation, the intervention,
              and the work people can do with them now.
            </p>
          </motion.div>
        )}

        <div className={styles.projects}>
          {projects.map((project, index) => {
            const caseStudyHref = `/work/${project.slug}`;

            return (
              <motion.article
                key={project.title}
                className={`${styles.project} ${index === 0 ? styles.featured : styles.supporting}`}
                initial={reduceMotion ? false : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: reduceMotion ? 0 : 0.58, delay: reduceMotion ? 0 : index * 0.08, ease }}
              >
                <Link
                  href={caseStudyHref}
                  className={styles.visual}
                  aria-label={`${project.title} case study`}
                >
                  <MediaReveal>
                    <Image
                      src={project.artwork.src}
                      alt={project.artwork.alt}
                      fill
                      sizes={index === 0 ? '(max-width: 1480px) calc(100vw - 2.5rem), 1440px' : '(max-width: 900px) calc(100vw - 2.5rem), 58vw'}
                      className={styles.artwork}
                      priority={index === 0}
                    />
                  </MediaReveal>
                  <span className={styles.visualShade} aria-hidden="true" />
                  <span className={styles.projectIndex} aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className={styles.visualCaption}>{project.artwork.caption}</span>
                </Link>

                <div className={styles.content}>
                  <div className={styles.topline}>
                    <span>{project.category}</span>
                    <span>{project.domain}</span>
                  </div>

                  <h2 className={styles.title}>
                    <Link href={caseStudyHref}>{project.title}</Link>
                  </h2>
                  <p className={styles.description}>{project.description}</p>

                  <div className={styles.supports}>
                    <p>What the work supports</p>
                    <ul>
                      {project.capabilities.map((capability, capabilityIndex) => (
                        <li key={capability}>
                          <span>{String(capabilityIndex + 1).padStart(2, '0')}</span>
                          {capability}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className={styles.actions}>
                    <Link href={caseStudyHref} className={styles.caseStudyLink}>
                      Read the case study <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                    <a
                      href={project.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.visitLink}
                    >
                      Visit live site <ExternalLink size={14} aria-hidden="true" />
                      <span className="srOnly"> (opens in a new tab)</span>
                    </a>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
