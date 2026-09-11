import Link from 'next/link';
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

const process = [
  {
    title: 'Understand',
    description: 'We discuss what you need, how your team works, and the constraints to account for.',
    output: 'A shared brief and priorities',
  },
  {
    title: 'Shape',
    description: 'We agree what to build, the budget, the timeline, and what each side will provide.',
    output: 'An agreed scope and delivery plan',
  },
  {
    title: 'Build',
    description: 'We build in stages, test the system, and review working versions with your team.',
    output: 'Usable deliverables, reviewed together',
  },
  {
    title: 'Operate',
    description: 'We document the handover and provide hosting and ongoing support where agreed.',
    output: 'Clear ownership and agreed support',
  },
];

export default function BuildPage() {
  return (
    <>
      <main className={styles.main}>
        <PageHeader
          scene="services"
          compact
          eyebrow="Services"
          title="Technology for your business."
          lead="Websites, software, data, AI, branding, and hosting for businesses in Tanzania."
        >
          <Link href="/contact" className={styles.heroBtn}>
            {cta.primary} <span aria-hidden="true">→</span>
          </Link>
        </PageHeader>

        {/* Overview and jump links first; the six chapters follow. */}
        <CapabilityMap />

        <CapabilityJourney />

        {/* Process */}
        <section className={styles.processSection}>
          <div className="container">
            <ScrollReveal>
              <h2 className={styles.sectionHeading}>How projects run</h2>
              <BuildCards className={styles.processGrid}>
                {process.map((item) => (
                  <div key={item.title} className={styles.processCard}>
                    <h3 className={styles.processTitle}>{item.title}</h3>
                    <p className={styles.processDescription}>{item.description}</p>
                    <p className={styles.processOutput}>{item.output}</p>
                  </div>
                ))}
              </BuildCards>
            </ScrollReveal>
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
