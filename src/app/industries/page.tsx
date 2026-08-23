import { CtaBand } from '@/components/CtaBand';
import { PageHeader } from '@/components/PageHeader';
import { Spotlight } from '@/components/Spotlight';
import { ScrollReveal } from '@/components/ScrollReveal';
import { sectors } from '@/content/sectors';
import styles from './Industries.module.css';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata({
  title: 'Industries',
  description:
    'How Ubunifu Technologies helps organisations across Tanzania: tourism, SMEs & retail, finance, NGOs, healthcare, agriculture, education, and government.',
  path: '/industries',
});

export default function IndustriesPage() {
  const tourism = sectors.find((s) => s.key === 'tourism')!;
  const others = sectors.filter((s) => s.key !== 'tourism');

  return (
    <>
      <main>
        <PageHeader
          eyebrow="Who we serve"
          title="Experience where it is proven. Capability where the problem fits."
          lead="Our shipped client work is in tourism. The other sectors below are places where our capabilities may fit, not a client list or a claim of specialist regulation expertise."
          artwork={{
            primary: {
              src: '/editorial/tourism-systems.webp',
              alt: 'Tactile editorial study of a tourism enquiry becoming an organised operating workflow',
            },
            caption: 'Editorial study · From enquiry to operation',
          }}
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
              priority
              overlap={{ title: 'Proven', sub: 'Built for Safari King & Usambara' }}
            />
          </div>
        </section>

        {/* Other sectors */}
        <section className={`section ${styles.gridSection}`}>
          <div className="container">
            <div className={styles.sectionIntro}>
              <ScrollReveal className={styles.introCopy}>
                <span className="eyebrow">Potential fit</span>
                <h2 className={styles.heading}>Use cases we are equipped to explore</h2>
                <p className={styles.sub}>
                  We start with the problem pattern, then earn the domain
                  context with the people who know it best.
                </p>
              </ScrollReveal>

              <ScrollReveal className={styles.introVisual} delay={120}>
                <span className={styles.introBadge}>Our test</span>
                <p className={styles.introStatement}>
                  Does the problem match our capability, and can we learn the
                  domain well enough to do responsible work?
                </p>
                <p className={styles.introFoot}>
                  If not, we say so. If specialist partners are needed, we make
                  that part of the plan.
                </p>
              </ScrollReveal>
            </div>

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
