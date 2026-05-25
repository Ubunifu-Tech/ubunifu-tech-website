'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ExternalLink, MousePointer2 } from 'lucide-react';
import { projects } from '@/content/portfolio';
import styles from './Portfolio.module.css';

export const Portfolio: React.FC = () => {
  return (
    <section id="portfolio" className={`section ${styles.portfolio}`}>
      <div className="container">
        <motion.div
          className={styles.header}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="eyebrow">Our work</span>
          <h2 className={styles.heading}>Built by Ubunifu</h2>
          <p className={styles.subheading}>
            Websites and platforms designed and built for businesses across Tanzania.
          </p>
        </motion.div>

        <div className={styles.grid}>
          {projects.map((project, index) => (
            <motion.article
              key={project.title}
              className={styles.card}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
              style={{ ['--brand-accent' as string]: project.accent }}
            >
              {/* Browser mockup */}
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

                <div
                  className={styles.viewport}
                  style={{ background: project.logoBg }}
                >
                  <div className={styles.gridLines} aria-hidden="true" />

                  <div className={styles.logoStage}>
                    <Image
                      src={project.logo}
                      alt={`${project.title} logo`}
                      fill
                      sizes="(max-width: 768px) 60vw, 280px"
                      className={styles.logoImg}
                      style={{ objectFit: 'contain' }}
                    />
                  </div>

                  <div className={styles.pills}>
                    {project.highlights.map((h, i) => (
                      <span
                        key={h}
                        className={styles.pill}
                        style={{ animationDelay: `${0.4 + i * 0.15}s` }}
                      >
                        {h}
                      </span>
                    ))}
                  </div>

                  <div className={styles.ctaRow}>
                    <button type="button" className={styles.fakeCta} tabIndex={-1}>
                      {project.cta}
                    </button>
                    <span className={styles.cursor} aria-hidden="true">
                      <MousePointer2 size={20} strokeWidth={2.5} fill="white" />
                    </span>
                    <span className={styles.confirm} aria-hidden="true">
                      <span className={styles.confirmIcon}>✓</span>
                      Inquiry sent
                    </span>
                  </div>
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
