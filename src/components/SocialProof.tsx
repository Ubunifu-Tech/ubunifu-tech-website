import React from 'react';
import styles from './SocialProof.module.css';

const icons = {
  expertise: <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>,
  location: <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  flexible: <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
  partnership: <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
};

export const SocialProof: React.FC = () => {
  return (
    <section className={styles.socialProof}>
      <div className="container">
        <div className={styles.header}>
          <h2 className={styles.heading}>Why work with us?</h2>
          <p className={styles.subheading}>
            A new consultancy bringing Silicon Valley-caliber expertise to Tanzania's business community.
          </p>
        </div>

        <div className={styles.capabilitiesGrid}>
          <div className={styles.capability}>
            <div className={styles.capabilityIcon}>{icons.expertise}</div>
            <h3 className={styles.capabilityTitle}>Silicon Valley-Trained Expertise</h3>
            <p className={styles.capabilityDescription}>
              Advanced training in AI, Machine Learning, and global design standards. We bring the same technical rigor and creative excellence used by top US tech companies and international design studios.
            </p>
          </div>

          <div className={styles.capability}>
            <div className={styles.capabilityIcon}>{icons.location}</div>
            <h3 className={styles.capabilityTitle}>Tanzania-Based & Available</h3>
            <p className={styles.capabilityDescription}>
              Based in Tanzania. We understand local business realities, market dynamics, and can meet face-to-face. No time zones, no cultural disconnect.
            </p>
          </div>

          <div className={styles.capability}>
            <div className={styles.capabilityIcon}>{icons.flexible}</div>
            <h3 className={styles.capabilityTitle}>Practical & Flexible</h3>
            <p className={styles.capabilityDescription}>
              From quick Excel analysis to full AI systems, brand design to complete websites. We handle ad-hoc projects and long-term partnerships—whatever your business needs.
            </p>
          </div>

          <div className={styles.capability}>
            <div className={styles.capabilityIcon}>{icons.partnership}</div>
            <h3 className={styles.capabilityTitle}>Transparent Partnership</h3>
            <p className={styles.capabilityDescription}>
              We're building our reputation project by project. You get our full attention, honest pricing, clear communication, and commitment to delivering measurable results.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
