import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PageAtmosphere } from '@/components/PageAtmosphere';
import { WorkPreview } from '@/components/HomePreviews';
import { CtaBand } from '@/components/CtaBand';
import { ScrollReveal } from '@/components/ScrollReveal';
import { BuildCards } from '@/components/BuildCards';
import { PageHeader } from '@/components/PageHeader';
import { CapabilityJourney } from '@/components/CapabilityJourney';
import { CapabilityMap } from '@/components/CapabilityMap';
import { EditorialPhoto } from '@/components/EditorialPhoto';
import styles from './Build.module.css';
import { cta } from '@/content/site';
import { processStages } from '@/content/process';
import { editorialPhotography } from '@/content/editorial-photography';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata({
  title: 'Services',
  description: 'Web development, hosting, domain management, professional email, data analytics, intelligent automation, branding, and digital strategy for businesses and organisations across Tanzania.',
  path: '/build',
});

export default function BuildPage() {
  return (
    <>
      <PageAtmosphere />
      <main data-atmosphere className={styles.main}>
        <PageHeader
          scene="services"
          eyebrow="Services"
          title="Technology for your business."
          lead="Websites, software, data, AI, branding, and hosting for businesses in Tanzania."
        >
          <Link href="/contact" className={styles.heroBtn}>
            {cta.primary} <ArrowRight size={17} strokeWidth={1.8} aria-hidden="true" />
          </Link>
        </PageHeader>

        {/* Overview and jump links first; the six chapters follow. */}
        <CapabilityMap />

        <CapabilityJourney />

        {/* Process */}
        <section className={styles.processSection}>
          <div className="container">
            <div className={styles.processLeadGrid}>
              <ScrollReveal className={styles.processIntro}>
                <h2 className={styles.sectionHeading}>
                  What happens <span className={styles.headingAccent}>after you say yes</span>?
                </h2>
                <p className={styles.processLead}>
                  Four stages, each ending in something you can hold us to.
                </p>
              </ScrollReveal>

              <ScrollReveal className={styles.processMedia} delay={100}>
                <EditorialPhoto
                  asset={editorialPhotography.servicesCodeReview}
                  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 54vw, 670px"
                />
              </ScrollReveal>
            </div>

            <BuildCards className={styles.processGrid}>
              {processStages.map((item) => (
                <div key={item.title} className={styles.processCard}>
                  <h3 className={styles.processTitle}>{item.title}</h3>
                  <p className={styles.processDescription}>{item.description}</p>
                  {/* The stage's deliverable. Previously styled via a
                      `.processOutput span` rule that matched nothing, because
                      the markup here has never had a span — so the rule and the
                      accent the design intended were invisible. */}
                  <p className={styles.processOutput}>
                    You get <strong>{item.output}</strong>.
                  </p>
                </div>
              ))}
            </BuildCards>
          </div>
        </section>

        {/* Selected work — link to full /work page */}
        <ScrollReveal>
          <WorkPreview />
        </ScrollReveal>
      </main>
      <CtaBand />
    </>
  );
}
