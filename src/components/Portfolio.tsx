'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import styles from './Portfolio.module.css';

const projects = [
  {
    title: 'Usambara Destination',
    category: 'Travel & Eco-Tourism',
    description: 'Premium eco-tourism website connecting travelers with the Usambara Mountains. Built for lightning-fast performance and SEO optimization.',
    image: '/images/usambara.jpg',
    link: 'https://www.usambaradestination.com/',
    tech: ['Next.js', 'TypeScript', 'Responsive', 'SEO'],
  },
  {
    title: 'Safari King Africa',
    category: 'Luxury Safari',
    description: 'High-performance website showcasing Tanzania\'s premier destinations with modern UI/UX and mobile-first design.',
    image: '/images/safariking.png',
    link: 'https://www.safarikingafrica.com/',
    tech: ['React', 'Modern UI/UX', 'Mobile-First', 'Lead Forms'],
  },
];

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
          <span className="eyebrow">Portfolio</span>
          <h2 className={styles.heading}>Built by Ubunifu</h2>
          <p className={styles.subheading}>Websites and platforms designed and built for Tanzanian businesses.</p>
        </motion.div>

        <div className={styles.grid}>
          {projects.map((project, index) => (
            <motion.div
              key={project.title}
              className={styles.card}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className={styles.imageWrapper}>
                <Image
                  src={project.image}
                  alt={project.title}
                  fill
                  className={styles.image}
                  style={{ objectFit: 'contain' }}
                />
                <div className={styles.overlay}>
                  <a href={project.link} target="_blank" rel="noopener noreferrer" className={styles.visitBtn}>
                    Visit Website
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
              <div className={styles.content}>
                <span className={styles.category}>{project.category}</span>
                <h3 className={styles.title}>{project.title}</h3>
                <p className={styles.description}>{project.description}</p>

                <div className={styles.techStack}>
                  {project.tech.map((tech) => (
                    <span key={tech} className={styles.techTag}>{tech}</span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
