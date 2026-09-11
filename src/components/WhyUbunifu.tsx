import React from 'react';
import { pillars } from '@/content/pillars';
import { ScrollReveal } from './ScrollReveal';
import styles from './WhyUbunifu.module.css';

/**
 * The four differentiators, directly beneath the hero.
 *
 * Placed here because this is the position that answers "why keep reading" — and
 * because the section below it (CapabilitiesIndex) is a text-only hairline row
 * list, so an icon grid on a white ground gives the top of the page two visibly
 * different textures rather than two lists in a row.
 *
 * The copy is from src/content/pillars.tsx, which was written for the removed
 * ProblemStrip and has rendered nowhere since. It is not rewritten here.
 */
export function WhyUbunifu() {
  return (
    <section className={styles.section} aria-labelledby="why-ubunifu-title">
      <div className="container">
        <ScrollReveal>
          <h2 id="why-ubunifu-title" className={styles.heading}>
            Why Ubunifu
          </h2>
        </ScrollReveal>

        <ul className={styles.grid}>
          {pillars.map(({ icon: Icon, label, body }) => (
            <li key={label} className={styles.pillar}>
              <span className={styles.icon} aria-hidden="true">
                <Icon size={24} strokeWidth={1.75} />
              </span>
              <h3 className={styles.label}>{label}</h3>
              <p className={styles.body}>{body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
