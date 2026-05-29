'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Github, Linkedin, Globe } from 'lucide-react';
import { team } from '@/content/team';
import styles from './Team.module.css';

const linkIcon = {
  github: Github,
  linkedin: Linkedin,
  site: Globe,
} as const;

const linkLabel = {
  github: 'GitHub',
  linkedin: 'LinkedIn',
  site: 'Website',
} as const;

export const Team: React.FC = () => {
  return (
    <section id="team" className={`section ${styles.section}`}>
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="eyebrow">The team</span>
          <h2 className={styles.heading}>Who you work with</h2>
          <p className={styles.intro}>
            We&apos;re small on purpose. You work directly with the people who
            build the thing. No account managers, no handoffs, no telephone game.
          </p>
        </motion.div>

        <div className={styles.grid}>
          {team.map((member, index) => (
            <motion.article
              key={member.name}
              className={styles.card}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className={styles.top}>
                {member.photo ? (
                  <div className={styles.photoWrap}>
                    <Image
                      src={member.photo}
                      alt={member.name}
                      fill
                      sizes="72px"
                      className={styles.photo}
                      style={{ objectFit: 'cover' }}
                    />
                  </div>
                ) : (
                  <div className={styles.avatar} aria-hidden="true">
                    {member.initials}
                  </div>
                )}
                <div>
                  <h3 className={styles.name}>{member.name}</h3>
                  <p className={styles.role}>{member.role}</p>
                </div>
              </div>

              <p className={styles.bio}>{member.bio}</p>

              <div className={styles.skills}>
                {member.skills.map((skill) => (
                  <span key={skill} className={styles.skill}>
                    {skill}
                  </span>
                ))}
              </div>

              {member.links && member.links.length > 0 && (
                <div className={styles.links}>
                  {member.links.map((link) => {
                    const Icon = linkIcon[link.type];
                    return (
                      <a
                        key={link.href}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.link}
                        aria-label={`${member.name} on ${linkLabel[link.type]}`}
                      >
                        <Icon size={17} />
                      </a>
                    );
                  })}
                </div>
              )}
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
};
