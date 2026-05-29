import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { PageHeader } from '@/components/PageHeader';
import { About } from '@/components/About';
import { Team } from '@/components/Team';
import styles from './About.module.css';

export const metadata = {
  title: 'About',
  description:
    'Ubunifu Technologies is a small software team in Arusha, Tanzania, building products and consulting for African businesses, built from local workflows rather than adapted from elsewhere.',
};

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main>
        <PageHeader
          eyebrow="About us"
          title="Software built for Africa, from Africa."
          lead="We are a small team in Arusha, Tanzania, building products and consulting for the businesses around us. We start from how this market actually works, not from tools made for somewhere else."
        />

        <About hideHeader />
        <Team />

        <section className={styles.cta}>
          <div className="container">
            <div className={styles.ctaInner}>
              <h2 className={styles.ctaHeading}>Want to work with us?</h2>
              <p className={styles.ctaText}>
                Whether you need a product, a custom build, or a conversation
                about what is possible, we respond to every message.
              </p>
              <Link href="/contact" className={styles.ctaBtn}>
                Get in touch
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
