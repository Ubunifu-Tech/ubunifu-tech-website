import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { site, cta } from '@/content/site';
import { AmbientShader, type ShaderCharacter } from './AmbientShader';
import styles from './CtaBand.module.css';

const CTA_SHADER: ShaderCharacter = {
  colors: ['#FFF4EE', '#FFFFFF', '#EDE6FF', '#FFFFFF', '#F7E9FF'],
  distortion: 0.76,
  swirl: 0.24,
  speed: 0.06,
};

// Full-width closing call-to-action, kept separate from the footer.
export const CtaBand: React.FC = () => {
  return (
    <section className={styles.section}>
      <div className={styles.panel}>
        <AmbientShader placement="panelTall" character={CTA_SHADER} />
        <div className={`container ${styles.content}`}>
          <div className={styles.statement}>
            <h2 className={styles.heading}>Have a project in mind?</h2>
          </div>
          <div className={styles.details}>
            <p className={styles.text}>
              Tell us what you need. We can discuss the scope, timing, and budget.
            </p>
            <div className={styles.actions}>
              <Link href={site.urls.contact} className={styles.btn}>
                {cta.primary}
                <ArrowRight size={17} strokeWidth={1.8} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
