'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import { projects } from '@/content/portfolio';
import styles from './Portfolio.module.css';

export const Portfolio: React.FC<{ hideHeader?: boolean }> = ({
  hideHeader = false,
}) => {
  return (
    <section id="portfolio" className={`section ${styles.portfolio}`}>
      <div className="container">
        {!hideHeader && (
          <motion.div
            className={styles.header}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="eyebrow">Selected work</span>
            <h2 className={styles.heading}>What we&apos;ve shipped for clients</h2>
            <p className={styles.subheading}>
              Real platforms running in production for Tanzanian businesses. Built by the
              same team that ships our own products.
            </p>
          </motion.div>
        )}

        <div className={styles.grid}>
          {projects.map((project, index) => (
            <motion.article
              key={project.title}
              className={styles.card}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Browser-framed screenshot */}
              <div className={styles.browser}>
                <div className={styles.browserBar}>
                  <span className={styles.dot} style={{ background: '#ff5f57' }} />
                  <span className={styles.dot} style={{ background: '#febc2e' }} />
                  <span className={styles.dot} style={{ background: '#28c840' }} />
                  <div className={styles.urlBar}>
                    <span className={styles.urlLock} aria-hidden="true">🔒</span>
                    <span className={styles.urlText}>{project.domain}</span>
                  </div>
                </div>

                <div className={styles.viewport}>
                  <Image
                    src={project.primary.src}
                    alt={project.primary.alt}
                    fill
                    sizes="(max-width: 900px) 100vw, 50vw"
                    className={styles.screenshot}
                    priority={index === 0}
                  />
                </div>
              </div>

              {/* Content */}
              <div className={styles.content}>
                <div className={styles.contentTop}>
                  <span className={styles.category}>{project.category}</span>
                  <a
                    href={project.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.visitBtn}
                    aria-label={`Visit ${project.title}`}
                  >
                    Visit
                    <ExternalLink size={14} />
                  </a>
                </div>
                <h3 className={styles.title}>{project.title}</h3>
                <p className={styles.description}>{project.description}</p>

                <ul className={styles.capabilities}>
                  {project.capabilities.map((capability) => (
                    <li key={capability} className={styles.capability}>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {capability}
                    </li>
                  ))}
                </ul>

                <div className={styles.techStack}>
                  {project.tech.map((tech) => (
                    <span key={tech} className={styles.techTag}>
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
};
