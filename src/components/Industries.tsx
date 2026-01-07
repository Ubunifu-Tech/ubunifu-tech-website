import React from 'react';
import styles from './Industries.module.css';

const icons = {
  sme: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  tourism: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  ngo: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  healthcare: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
  finance: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  agriculture: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  education: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  government: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  retail: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>,
};

const industries = [
  {
    icon: icons.sme,
    title: 'SMEs & Startups',
    description: 'Professional online presence, e-commerce capabilities, and data-driven growth strategies.'
  },
  {
    icon: icons.tourism,
    title: 'Tourism & Hospitality',
    description: 'Digital marketing, online booking systems, and customer experience management for hotels and safari operators.'
  },
  {
    icon: icons.ngo,
    title: 'NGOs & Civil Society',
    description: 'Impact measurement, data dashboards, communication platforms, and process automation.'
  },
  {
    icon: icons.healthcare,
    title: 'Healthcare',
    description: 'Patient management systems, data security, health information systems, and digital service delivery.'
  },
  {
    icon: icons.finance,
    title: 'Financial Services',
    description: 'Customer analytics, digital channel enhancement, CRM solutions, and secure online platforms.'
  },
  {
    icon: icons.agriculture,
    title: 'Agriculture',
    description: 'Farm management tools, market linkage platforms, supply chain optimization, and yield analytics.'
  },
  {
    icon: icons.education,
    title: 'Education',
    description: 'E-learning platforms, student management systems, and digital educational resources.'
  },
  {
    icon: icons.government,
    title: 'Government & Public Sector',
    description: 'Citizen engagement platforms, public service delivery tools, and data management systems.'
  },
  {
    icon: icons.retail,
    title: 'Retail & Manufacturing',
    description: 'E-commerce solutions, inventory management, supply chain optimization, and customer analytics.'
  }
];

export const Industries: React.FC = () => {
  return (
    <section className={styles.industries}>
      <div className="container">
        <div className={styles.header}>
          <h2 className={styles.heading}>
            Serving <span className="text-gradient">All Sectors</span>
          </h2>
          <p className={styles.subheading}>
            From SMEs to large corporations—we deliver digital transformation across Tanzania's key industries.
          </p>
        </div>

        <div className={styles.grid}>
          {industries.map((industry, index) => (
            <div key={index} className={styles.card}>
              <div className={styles.icon}>{industry.icon}</div>
              <h3 className={styles.title}>{industry.title}</h3>
              <p className={styles.description}>{industry.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
