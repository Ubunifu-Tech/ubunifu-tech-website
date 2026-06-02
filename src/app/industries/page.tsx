import { CtaBand } from '@/components/CtaBand';
import { PageHeader } from '@/components/PageHeader';
import { Spotlight } from '@/components/Spotlight';
import { ScrollReveal } from '@/components/ScrollReveal';
import { sectors } from '@/content/sectors';
import styles from './Industries.module.css';

export const metadata = {
  title: 'Industries',
  description:
    'How Ubunifu Technologies helps organisations across Tanzania: tourism, SMEs & retail, finance, NGOs, healthcare, agriculture, education, and government.',
};

export default function IndustriesPage() {
  const tourism = sectors.find((s) => s.key === 'tourism')!;
  const others = sectors.filter((s) => s.key !== 'tourism');

  return (
    <>
      <main>
        <PageHeader
          eyebrow="Who we serve"
          title="Built for the way your sector works."
          lead="We work across Tanzania's economy. Our shipped work is in tourism so far, and the same engineering applies wherever there's a real problem to solve."
        />

        {/* Proven sector — spotlight */}
        <section className={styles.spotlightSection}>
          <div className="container">
            <Spotlight
              eyebrow="Proven sector"
              title={tourism.label}
              body={tourism.summary}
              items={tourism.offerings}
              cta={{ label: 'See the work', href: '/work' }}
              image={{
                src: '/work/safari-king-hero.png',
                alt: 'Safari King Africa booking site built by Ubunifu',
                domain: 'safarikingafrica.com',
              }}
              overlap={{ title: 'Proven', sub: 'Built for Safari King & Usambara' }}
            />
          </div>
        </section>

        {/* Other sectors */}
        <section className={`section ${styles.gridSection}`}>
          <div className="container">
            <ScrollReveal>
              <span className="eyebrow">And across the economy</span>
              <h2 className={styles.heading}>Where else we can help</h2>
              <p className={styles.sub}>
                We&apos;re equipped to serve these sectors. Framed as what we&apos;d
                build, not clients we claim, until the work is shipped.
              </p>
            </ScrollReveal>

            <div className={styles.grid}>
              {others.map((sector, index) => {
                const Icon = sector.icon;
                return (
                  <ScrollReveal
                    key={sector.key}
                    className={styles.card}
                    delay={index * 60}
                  >
                    <div className={styles.cardIcon}>
                      <Icon size={22} />
                    </div>
                    <h3 className={styles.cardTitle}>{sector.label}</h3>
                    <p className={styles.cardSummary}>{sector.summary}</p>
                    <div className={styles.chips}>
                      {sector.offerings.map((offering) => (
                        <span key={offering} className={styles.chip}>
                          {offering}
                        </span>
                      ))}
                    </div>
                  </ScrollReveal>
                );
              })}
            </div>

            <ScrollReveal>
              <p className={styles.note}>
                Don&apos;t see your sector? Most digital problems rhyme.{' '}
                <a href="/contact" className={styles.noteLink}>
                  Tell us yours
                </a>
                .
              </p>
            </ScrollReveal>
          </div>
        </section>
      </main>
      <CtaBand />
    </>
  );
}
