import React from 'react';
import Link from 'next/link';
import styles from './Hero.module.css';

export const Hero: React.FC = () => {
  return (
    <section className={styles.hero}>
      <div className={`container ${styles.container}`}>
        <span className="eyebrow">Dar es Salaam, Tanzania</span>

        <h1 className={styles.title}>
          We build software<br />for Africa.
        </h1>

        <p className={styles.subtitle}>
          Ubunifu Technologies creates SaaS products designed around how businesses
          in Tanzania actually work — pay as you go, WhatsApp support, and built to
          run on the infrastructure available here.
        </p>

        <div className={styles.actions}>
          <a href="#products" className={styles.btnPrimary}>See our products</a>
          <a href="#contact" className={styles.btnSecondary}>Get in touch</a>
        </div>
      </div>
    </section>
  );
};
