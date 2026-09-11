import Link from 'next/link';
import { CtaBand } from '@/components/CtaBand';
import { PageHeader } from '@/components/PageHeader';
import { ScrollReveal } from '@/components/ScrollReveal';
import { Spotlight } from '@/components/Spotlight';
import { sectors } from '@/content/sectors';
import { cta } from '@/content/site';
import { projects } from '@/content/portfolio';
import styles from './Industries.module.css';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata({
  title: 'Industries',
  description:
    'Proven tourism work from Ubunifu Technologies, plus potential workflow use cases for organisations in other Tanzanian sectors.',
  path: '/industries',
});

export default function IndustriesPage() {
  const tourism = sectors.find((s) => s.key === 'tourism')!;
  const others = sectors.filter((s) => s.key !== 'tourism');
  const tourismArtwork = projects.find((project) => project.slug === 'safari-king')!.artwork;

  return (
    <>
      <main>
        <PageHeader
          scene="industries"
          compact
          eyebrow="Industries"
          title="Tourism and other industries"
          lead="Explore our work for Tanzanian tourism businesses and examples of projects we can discuss in other sectors."
        />

        {/* Rendered through the shared Spotlight row rather than a bespoke
            block, so the proven sector and any future one share a treatment. */}
        <section className={styles.provenSection} aria-labelledby="proven-sector-title">
          <div className="container">
            <Spotlight
              id="proven-sector"
              headingLevel={2}
              title={tourism.label}
              body={tourism.summary}
              items={tourism.offerings}
              cta={{ label: 'See the client work', href: '/work' }}
              image={{ src: tourismArtwork.src, alt: tourismArtwork.alt }}
              priority
            />
          </div>
        </section>

        {/* Other sectors */}
        <section className={`section ${styles.gridSection}`}>
          <div className="container">
            <div className={styles.sectionIntro}>
              <ScrollReveal className={styles.introCopy}>
                <h2 id="potential-sectors-title" className={styles.heading}>Other industries</h2>
                <p className={styles.sub}>
                  Outside tourism, these are examples of projects we can discuss,
                  not a list of past clients.
                </p>
              </ScrollReveal>

            </div>

            <div className={styles.grid} aria-labelledby="potential-sectors-title">
              {others.map((sector, index) => {
                return (
                  <ScrollReveal
                    key={sector.key}
                    className={styles.card}
                    delay={index * 60}
                  >
                    <div>
                      <h3 className={styles.cardTitle}>{sector.label}</h3>
                      {sector.summary && <p className={styles.cardSummary}>{sector.summary}</p>}
                    </div>
                    <ul className={styles.chips}>
                      {sector.offerings.map((offering) => (
                        <li key={offering} className={styles.chip}>
                          {offering}
                        </li>
                      ))}
                    </ul>
                  </ScrollReveal>
                );
              })}
            </div>

            <ScrollReveal>
              <p className={styles.note}>
                Don&apos;t see your sector?{' '}
                <Link href="/contact" className={styles.noteLink}>
                  {cta.primary}
                </Link>
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
