import React from 'react';
import styles from './About.module.css';

const team = [
  {
    name: 'Richard Pallangyo',
    role: 'Founder & CEO',
    bio: 'Builds the products. Richard has worked in data science and software engineering, and started Ubunifu to put that work to use building tools for African businesses rather than for someone else.',
    skills: ['AI & Machine Learning', 'Data Engineering', 'Python / FastAPI', 'Product'],
  },
  {
    name: 'HappyGod Pallangyo',
    role: 'Creative Director',
    bio: 'Shapes how the products look and feel. HappyGod brings brand, design, and visual direction — making sure our software is clear and honest, not just functional.',
    skills: ['Brand Identity', 'UI/UX Design', 'Visual Direction', 'Video'],
  },
];

export const About: React.FC = () => {
  return (
    <section id="about" className={styles.about}>
      <div className="container">
        <span className="eyebrow">The Team</span>
        <h2 className={styles.heading}>Built in Tanzania</h2>
        <p className={styles.intro}>
          We are a small team focused on one thing: building software that works for African businesses.
          No unnecessary complexity, no subscription traps.
        </p>

        <div className={styles.teamGrid}>
          {team.map((person) => (
            <div key={person.name} className={styles.card}>
              <p className={styles.role}>{person.role}</p>
              <h3 className={styles.name}>{person.name}</h3>
              <p className={styles.bio}>{person.bio}</p>
              <div className={styles.skills}>
                {person.skills.map((s) => (
                  <span key={s} className={styles.skill}>{s}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
