import React from 'react';
import { ScrollReveal } from './ScrollReveal';
import { Topography } from './Topography';
import styles from './ProofBand.module.css';

// Truthful proof points only (see POSITIONING.md). No invented metrics.
const proof: ReadonlyArray<{ value: string; label: string }> = [
  { value: '2', label: 'Live SaaS products' },
  { value: '5.0★', label: 'TripAdvisor client rating' },
  { value: 'Claude', label: 'AI we build on' },
  { value: '100%', label: 'Built in Arusha, TZ' },
];

export const ProofBand: React.FC = () => {
  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.band}>
          <Topography className={styles.topo} />
          {proof.map((item, index) => (
            <ScrollReveal key={item.label} className={styles.item} delay={index * 70}>
              <span className={styles.value}>{item.value}</span>
              <span className={styles.label}>{item.label}</span>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};
