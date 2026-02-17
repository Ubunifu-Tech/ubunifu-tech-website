import React from 'react';
import styles from './About.module.css';

const values = [
  {
    title: 'Built for Africa from the start',
    body: 'We do not adapt software built elsewhere. We start from the workflows, connectivity, and business models that exist here — and build around them.',
  },
  {
    title: 'No unnecessary complexity',
    body: 'Our products do one thing well. We ship what solves the problem, not what looks impressive in a demo.',
  },
  {
    title: 'Pricing that matches the market',
    body: 'Pay as you go, credit-based pricing. No annual contracts, no seat fees. If the product works for you, you will keep using it.',
  },
  {
    title: 'Tanzania-first, Africa-wide',
    body: 'We are based in Dar es Salaam. We build for the businesses we know, then expand across the continent as we grow.',
  },
];

export const About: React.FC = () => {
  return (
    <section id="about" className={styles.about}>
      <div className="container">
        <span className="eyebrow">About</span>
        <h2 className={styles.heading}>Why we exist</h2>
        <p className={styles.intro}>
          Ubunifu Technologies was started to build software products for African businesses — not to adapt
          tools built elsewhere. We are a small, focused team. Our first product is Ubunifu Insight.
        </p>

        <div className={styles.teamGrid}>
          {values.map((value) => (
            <div key={value.title} className={styles.card}>
              <h3 className={styles.valueTitle}>{value.title}</h3>
              <p className={styles.bio}>{value.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
