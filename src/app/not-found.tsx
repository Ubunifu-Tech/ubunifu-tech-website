import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Topography } from '@/components/Topography';
import styles from './NotFound.module.css';

export const metadata = {
  title: 'Page not found',
};

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className={styles.main}>
        <div className={styles.backdrop} aria-hidden="true">
          <div className={styles.aurora} />
          <Topography className={styles.topo} />
        </div>

        <div className={`container ${styles.inner}`}>
          <p className={styles.code}>404</p>
          <h1 className={styles.title}>This page wandered off.</h1>
          <p className={styles.lead}>
            The link may be broken, or the page may have moved. Here are a few
            good places to pick things back up.
          </p>
          <div className={styles.actions}>
            <Link href="/" className={styles.btnPrimary}>
              Back home
            </Link>
            <Link href="/work" className={styles.btnSecondary}>
              See our work
            </Link>
            <Link href="/contact" className={styles.btnSecondary}>
              Contact us
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
