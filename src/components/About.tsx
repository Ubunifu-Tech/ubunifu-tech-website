'use client';

import React from 'react';
import { Button } from './ui/Button';
import styles from './About.module.css';

export const About: React.FC = () => {
  const scrollToContact = () => {
    const element = document.getElementById('contact');
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="about" className={styles.about}>
      <div className="container">
        <div className={styles.header}>
          <div className={styles.badge}>Our Team</div>
          <h2 className={styles.heading}>
            Tanzania-Based. <br />
            <span className="text-gradient">Globally Trained.</span>
          </h2>
          <p className={styles.intro}>
            Silicon Valley-caliber technical expertise combined with award-winning creative talent—delivering world-class digital solutions from Tanzania.
          </p>
        </div>

        <div className={styles.teamGrid}>
          {/* Richard's Bio */}
          <div className={`${styles.teamCard} glass-panel`}>
            <div className={styles.role}>Founder & Lead Data Scientist</div>
            <h3 className={styles.name}>Richard Pallangyo</h3>
            <p className={styles.bio}>
              Silicon Valley-trained Data Scientist bringing advanced AI and Machine Learning expertise to Tanzania. Experience includes building predictive analytics systems, deploying production ML models, and architecting cloud-scale data infrastructure using the same methodologies as top US tech companies. Specializes in extracting actionable insights from data—from Excel spreadsheets to sophisticated AI systems.
            </p>
            <div className={styles.expertise}>
              <span className={styles.expertiseTag}>AI & Machine Learning</span>
              <span className={styles.expertiseTag}>Data Analysis</span>
              <span className={styles.expertiseTag}>Python/FastAPI</span>
              <span className={styles.expertiseTag}>Business Intelligence</span>
            </div>
          </div>

          {/* HappyGod's Bio */}
          <div className={`${styles.teamCard} glass-panel`}>
            <div className={styles.role}>Creative Director</div>
            <h3 className={styles.name}>HappyGod Pallangyo</h3>
            <p className={styles.bio}>
              Award-winning Creative Director delivering world-class design work from Tanzania. Specializes in brand identity, video production, and visual storytelling that captures attention and drives results. Blends international design standards with authentic African aesthetics to create work that stands out locally while competing globally. From logo design to full brand systems and video campaigns—ensuring businesses present professionally across all touchpoints.
            </p>
            <div className={styles.expertise}>
              <span className={styles.expertiseTag}>Brand Identity</span>
              <span className={styles.expertiseTag}>Video Production</span>
              <span className={styles.expertiseTag}>Graphic Design</span>
              <span className={styles.expertiseTag}>UI/UX Design</span>
            </div>
          </div>
        </div>

        <div className={styles.mission}>
          <div className={styles.missionContent}>
            <h3>Our Mission: Driving Digital Transformation in Tanzania</h3>
            <p>
              Ubunifu Technologies is dedicated to empowering Tanzanian businesses and organizations through strategic implementation of digital solutions. We partner with enterprises across all sectors—tourism, healthcare, finance, NGOs, agriculture, education, and beyond—to achieve impactful digital transformation that is both ambitious and accessible.
            </p>
            <p>
              We combine Silicon Valley-caliber technical expertise with deep understanding of the local market, ensuring our solutions are not only technologically advanced but also culturally relevant and practically implementable within the Tanzanian context. From turning Excel spreadsheets into strategic insights to building complete digital ecosystems—we're committed to making world-class digital capabilities accessible to Tanzanian organizations of all sizes.
            </p>
            <Button variant="outline" onClick={scrollToContact}>Partner With Us</Button>
          </div>
        </div>
      </div>
    </section>
  );
};
