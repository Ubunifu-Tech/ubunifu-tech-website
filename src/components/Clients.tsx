'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { projects } from '@/content/portfolio';
import styles from './Clients.module.css';

interface ClientsProps {
  /** Optional heading override. */
  label?: string;
}

export const Clients: React.FC<ClientsProps> = ({
  label = 'Trusted by businesses across Tanzania',
}) => {
  return (
    <section className={styles.section}>
      <div className="container">
        <motion.p
          className={styles.label}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          {label}
        </motion.p>

        <div className={styles.row}>
          {projects.map((project, index) => (
            <motion.a
              key={project.title}
              href={project.link}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.logoCard}
              aria-label={`Visit ${project.title}`}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className={styles.logoWrap}>
                <Image
                  src={project.logo}
                  alt={`${project.title} logo`}
                  fill
                  sizes="160px"
                  className={styles.logo}
                  style={{ objectFit: 'contain' }}
                />
              </div>
              <span className={styles.name}>{project.title}</span>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
};
