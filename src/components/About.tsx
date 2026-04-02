'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Globe, Zap, CreditCard, MapPin } from 'lucide-react';
import styles from './About.module.css';

const values = [
  {
    icon: <Globe size={22} />,
    title: 'Built for Africa from the start',
    body: 'We do not adapt software built elsewhere. We start from the workflows, connectivity, and business models that exist here — and build around them.',
  },
  {
    icon: <Zap size={22} />,
    title: 'No unnecessary complexity',
    body: 'Our products do one thing well. We ship what solves the problem, not what looks impressive in a demo.',
  },
  {
    icon: <CreditCard size={22} />,
    title: 'Pricing that matches the market',
    body: 'Pay as you go, credit-based pricing. No annual contracts, no seat fees. If the product works for you, you will keep using it.',
  },
  {
    icon: <MapPin size={22} />,
    title: 'Tanzania-first, Africa-wide',
    body: 'We are based in Arusha. We build for the businesses we know, then expand across the continent as we grow.',
  },
];

export const About: React.FC = () => {
  return (
    <section id="about" className={`section ${styles.about}`}>
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="eyebrow">About</span>
          <h2 className={styles.heading}>Why we exist</h2>
          <p className={styles.intro}>
            Ubunifu Technologies builds software products and provides consulting for African businesses —
            not adapting tools built elsewhere. A small, focused team based in Arusha, shipping
            products like Insight and Sifa while helping businesses with custom builds.
          </p>
        </motion.div>

        <div className={styles.grid}>
          {values.map((value, index) => (
            <motion.div
              key={value.title}
              className={styles.card}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className={styles.iconWrapper}>{value.icon}</div>
              <h3 className={styles.valueTitle}>{value.title}</h3>
              <p className={styles.bio}>{value.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
