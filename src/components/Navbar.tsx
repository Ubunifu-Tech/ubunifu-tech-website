import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from './ui/Button';
import styles from './Navbar.module.css';

export const Navbar: React.FC = () => {
  return (
    <nav className={styles.navbar}>
      <div className={`container ${styles.container}`}>
        <Link href="/" className={styles.logo}>
          <Image src="/logo.png" alt="Ubunifu Tech" width={180} height={40} priority />
        </Link>
        
        <div className={styles.links}>
          <Link href="/#services" className={styles.link}>Services</Link>
          <Link href="/#portfolio" className={styles.link}>Portfolio</Link>
          <Link href="/blog" className={styles.link}>Blog</Link>
          <Link href="/#about" className={styles.link}>About</Link>
          <Link href="/#contact" className={styles.link}>Contact</Link>
        </div>

        <div className={styles.actions}>
          <Button size="sm" variant="glow">Get Started</Button>
        </div>
      </div>
    </nav>
  );
};
