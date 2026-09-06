import Image from 'next/image';
import Link from 'next/link';
import { CtaBand } from '@/components/CtaBand';
import { PageHeader } from '@/components/PageHeader';
import { ScrollReveal } from '@/components/ScrollReveal';
import { MediaReveal } from '@/components/MediaReveal';
import { sectors } from '@/content/sectors';
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

  return (
    <>
      <main>
        <PageHeader
          variant="field"
          register={['Proven work', 'Problem fit', 'Domain context']}
          eyebrow="Who we serve"
          title="Proven in tourism. Useful wherever the workflow fits."
          lead="Our published client work is in Tanzanian tourism. In other sectors, we begin with the workflow and work alongside the people who hold the domain expertise."
          artwork={{
            primary: {
              src: '/editorial/tourism-systems.webp',
              alt: 'Tactile editorial study of a tourism enquiry becoming an organised operating workflow',
            },
            caption: 'Conceptual illustration · From enquiry to operation',
          }}
        />

        <section className={styles.provenSection} aria-labelledby="proven-sector-title">
          <div className="container">
            <ScrollReveal className={styles.provenIntro}>
              <div>
                <span className="eyebrow">Proven sector</span>
                <h2 id="proven-sector-title" className={styles.provenTitle}>{tourism.label}</h2>
              </div>
              <p>{tourism.summary}</p>
            </ScrollReveal>

            <ScrollReveal className={styles.provenMedia} delay={90}>
              <MediaReveal>
                <Image
                  src="/editorial/safari-operations-system-v2.webp"
                  alt="Editorial illustration of Safari King Africa's enquiry-to-operations workflow"
                  fill
                  sizes="(max-width: 900px) 100vw, 1440px"
                  className={styles.provenImage}
                />
              </MediaReveal>
              <span className={styles.provenRail} aria-hidden="true" />
              <p className={styles.provenCaption}>Conceptual illustration · Safari King Africa enquiry to operation</p>
            </ScrollReveal>

            <div className={styles.provenRegister}>
              <p>Relevant capabilities</p>
              <ul>
                {tourism.offerings.map((offering, index) => (
                  <li key={offering}><span>{String(index + 1).padStart(2, '0')}</span>{offering}</li>
                ))}
              </ul>
              <Link href="/work" className={styles.provenLink}>See the client work <span aria-hidden="true">→</span></Link>
            </div>
          </div>
        </section>

        {/* Other sectors */}
        <section className={`section ${styles.gridSection}`}>
          <div className="container">
            <div className={styles.sectionIntro}>
              <ScrollReveal className={styles.introCopy}>
                <span className="eyebrow">Potential fit</span>
                <h2 id="potential-sectors-title" className={styles.heading}>Recurring problems, different domains</h2>
                <p className={styles.sub}>
                  The sector changes the context, risk, and language. The underlying
                  work often begins with a public experience, a record, a decision,
                  or a manual workflow that needs a better shape.
                </p>
              </ScrollReveal>

              <ScrollReveal className={styles.introVisual} delay={120}>
                <span className={styles.introBadge}>The working test</span>
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

            <div className={styles.grid} aria-labelledby="potential-sectors-title">
              {others.map((sector, index) => {
                return (
                  <ScrollReveal
                    key={sector.key}
                    className={styles.card}
                    delay={index * 60}
                  >
                    <span className={styles.cardIndex}>{String(index + 1).padStart(2, '0')}</span>
                    <h3 className={styles.cardTitle}>{sector.label}</h3>
                    <p className={styles.cardSummary}>{sector.summary}</p>
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
                Don&apos;t see your sector? Most digital problems rhyme.{' '}
                <a href="/contact" className={styles.noteLink}>
                Tell us about the workflow
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
