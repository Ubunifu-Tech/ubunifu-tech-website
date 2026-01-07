import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import styles from './Careers.module.css';

export const metadata = {
  title: 'Careers | Ubunifu Technologies',
  description: 'Join our team at Ubunifu Technologies. Career opportunities coming soon as we grow our digital transformation practice in Tanzania.',
};

export default function CareersPage() {
  return (
    <>
      <Navbar />
      <main className={styles.careers}>
        <div className="container">
          <div className={styles.content}>
            <h1 className={styles.title}>
              Careers <span className="text-gradient">Coming Soon</span>
            </h1>
            <p className={styles.description}>
              We're a growing digital transformation consultancy based in Tanzania, combining Silicon Valley-caliber expertise with deep local market understanding.
            </p>
            <p className={styles.description}>
              As we expand our services in web development, data analytics, AI solutions, brand design, and digital strategy—we'll be looking for talented individuals to join our team.
            </p>
            
            <div className={styles.comingSoon}>
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <h2 className={styles.subtitle}>No Open Positions Yet</h2>
              <p className={styles.subtext}>
                We'll post opportunities here as our business grows. Check back soon or reach out if you'd like to connect for future opportunities.
              </p>
              <div className={styles.contactCTA}>
                <Link href="/#contact" className={styles.button}>
                  Get In Touch
                </Link>
              </div>
            </div>

            <div className={styles.futureRoles}>
              <h3 className={styles.futureTitle}>Future Opportunities May Include:</h3>
              <div className={styles.rolesGrid}>
                <div className={styles.roleCard}>
                  <h4>Data Scientist / Analyst</h4>
                  <p>AI/ML expertise, Python, data visualization</p>
                </div>
                <div className={styles.roleCard}>
                  <h4>Full-Stack Developer</h4>
                  <p>React, Next.js, Node.js, Python/FastAPI</p>
                </div>
                <div className={styles.roleCard}>
                  <h4>UI/UX Designer</h4>
                  <p>Product design, prototyping, user research</p>
                </div>
                <div className={styles.roleCard}>
                  <h4>Brand Designer</h4>
                  <p>Visual identity, marketing materials, video</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
