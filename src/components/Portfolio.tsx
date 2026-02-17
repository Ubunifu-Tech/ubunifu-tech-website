import React from 'react';
import Image from 'next/image';
import styles from './Portfolio.module.css';

const projects = [
  {
    title: 'Usambara Destination',
    category: 'Travel & Eco-Tourism Platform',
    description: 'Premium eco-tourism website connecting travelers with the Usambara Mountains. Built for lightning-fast performance and SEO optimization.',
    image: '/images/usambara.jpg',
    link: 'https://www.usambaradestination.com/',
    tech: ['Next.js', 'TypeScript', 'Responsive Design', 'SEO']
  },
  {
    title: 'Safari King Africa',
    category: 'Luxury Safari Website',
    description: 'High-performance website showcasing Tanzania\'s premier destinations. Features dynamic content management, modern UI/UX, and mobile-first design.',
    image: '/images/safariking.png',
    link: 'https://www.safarikingafrica.com/',
    tech: ['React', 'Modern UI/UX', 'Mobile-First', 'Lead Forms']
  }
];

export const Portfolio: React.FC = () => {
  return (
    <section id="portfolio" className={styles.portfolio}>
      <div className="container">
        <div className={styles.header}>
          <h2 className={styles.heading}>Recent work.</h2>
          <p className={styles.subheading}>Live websites we've built for Tanzania-based tourism businesses.</p>
        </div>

        <div className={styles.grid}>
          {projects.map((project, index) => (
            <div key={index} className={styles.card}>
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
                  </a>
                </div>
              </div>
              <div className={styles.content}>
                <span className={styles.category}>{project.category}</span>
                <h3 className={styles.title}>{project.title}</h3>
                <p className={styles.description}>{project.description}</p>
                
                <div className={styles.techStack}>
                  {project.tech.map((tech, idx) => (
                    <span key={idx} className={styles.techTag}>{tech}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
