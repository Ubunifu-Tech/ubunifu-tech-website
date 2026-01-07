import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import styles from './Blog.module.css';

export default function BlogPage() {
  return (
    <main className={styles.blog}>
      <div className="container">
        <div className={styles.header}>
          <h1 className={styles.title}>Blog <span className="text-gradient">Coming Soon</span></h1>
          <p className={styles.description}>
            We're preparing insightful content on digital transformation, AI, and technology solutions for Tanzania businesses. Check back soon for expert perspectives and industry insights.
          </p>
          <div className={styles.comingSoon}>
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
            <p>Stay tuned for updates</p>
          </div>
        </div>
      </div>
    </main>
  );
}
<Footer />
