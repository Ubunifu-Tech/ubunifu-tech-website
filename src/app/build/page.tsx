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
import styles from './Build.module.css';
import { cta } from '@/content/site';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata({
  title: 'Services',
  description: 'Web development, hosting, domain management, professional email, data analytics, intelligent automation, branding, and digital strategy for businesses and organisations across Tanzania.',
  path: '/build',
});

// Four stages in an order, each ending in something the client can hold us to.
// `output` is written as a lower-case fragment because it is rendered inside the
// sentence "You get <output>." — keep it a noun phrase, not a sentence.
const process = [
  {
    title: 'Understand',
    description: 'We discuss what you need, how your team works, and the constraints to account for.',
    output: 'a shared brief and priorities',
  },
  {
    title: 'Shape',
    description: 'We agree what to build, the budget, the timeline, and what each side will provide.',
    output: 'an agreed scope and delivery plan',
  },
  {
    title: 'Build',
    description: 'We build in stages, test the system, and review working versions with your team.',
    output: 'usable deliverables, reviewed together',
  },
  {
    title: 'Operate',
    description: 'We document the handover and provide hosting and ongoing support where agreed.',
    output: 'clear ownership and agreed support',
  },
];

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
            <ScrollReveal className={styles.processIntro}>
              <h2 className={styles.sectionHeading}>
                What happens <span className={styles.headingAccent}>after you say yes</span>?
              </h2>
              <p className={styles.processLead}>
                Four stages, each ending in something you can hold us to.
              </p>
            </ScrollReveal>

            <BuildCards className={styles.processGrid}>
              {process.map((item) => (
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
