import React from 'react';
import type { IconType } from 'react-icons';
import {
  SiNextdotjs,
  SiReact,
  SiTypescript,
  SiJavascript,
  SiNodedotjs,
  SiPython,
  SiFastapi,
  SiPostgresql,
  SiPrisma,
  SiFramer,
  SiVercel,
  SiGit,
} from 'react-icons/si';
import styles from './TechMarquee.module.css';

// Technologies actually used across Ubunifu's products and client builds.
const tech: ReadonlyArray<{ name: string; Icon: IconType }> = [
  { name: 'Next.js', Icon: SiNextdotjs },
  { name: 'React', Icon: SiReact },
  { name: 'TypeScript', Icon: SiTypescript },
  { name: 'JavaScript', Icon: SiJavascript },
  { name: 'Node.js', Icon: SiNodedotjs },
  { name: 'Python', Icon: SiPython },
  { name: 'FastAPI', Icon: SiFastapi },
  { name: 'PostgreSQL', Icon: SiPostgresql },
  { name: 'Prisma', Icon: SiPrisma },
  { name: 'Framer Motion', Icon: SiFramer },
  { name: 'Vercel', Icon: SiVercel },
  { name: 'Git', Icon: SiGit },
];

export const TechMarquee: React.FC = () => {
  return (
    <section className={styles.section} aria-label="Technologies we work with">
      <p className={styles.label}>The tools we build with</p>

      <div className={styles.marquee}>
        <div className={styles.track}>
          {[...tech, ...tech].map(({ name, Icon }, index) => (
            <div
              className={styles.item}
              key={`${name}-${index}`}
              aria-hidden={index >= tech.length}
            >
              <Icon className={styles.icon} />
              <span className={styles.name}>{name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
