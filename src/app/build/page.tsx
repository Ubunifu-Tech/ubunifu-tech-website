import Link from 'next/link';
import { WorkPreview } from '@/components/HomePreviews';
import { CtaBand } from '@/components/CtaBand';
import { ScrollReveal } from '@/components/ScrollReveal';
import { BuildCards } from '@/components/BuildCards';
import { PageHeader } from '@/components/PageHeader';
import { CapabilityJourney } from '@/components/CapabilityJourney';
import styles from './Build.module.css';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata({
  title: 'Services',
  description: 'Web development, hosting, domain management, professional email, data analytics, intelligent automation, branding, and digital strategy for businesses and organisations across Tanzania.',
  path: '/build',
});

const process = [
  {
    step: '1',
    title: 'Understand',
    description: 'We learn the workflow, the people, the risk, and the outcome before prescribing technology.',
  },
  {
    step: '2',
    title: 'Shape',
    description: 'We turn the problem into a clear scope, working model, timeline, and decision path.',
  },
  {
    step: '3',
    title: 'Build',
    description: 'We ship useful increments, keep you close to the work, and test the system as it takes shape.',
  },
  {
    step: '4',
    title: 'Operate',
    description: 'We host, support, review, and improve the result after launch when the engagement calls for it.',
  },
];

export default function BuildPage() {
  return (
    <>
      <main className={styles.main}>
        <PageHeader
          variant="field"
          register={['Advise', 'Design', 'Engineer', 'Support']}
          eyebrow="Consulting services"
          title="Advice, design, engineering, and support around the problem at hand."
          lead="Start with one defined need or a connected piece of work. We scope honestly, combine only the capabilities the outcome requires, and agree what happens after launch."
          artwork={{
            primary: {
              src: '/editorial/software-tanzania-learning.webp',
              alt: 'Tactile workbench showing research, modular decisions, and a working system coming together',
            },
            secondary: {
              src: '/editorial/hosting-system-art.webp',
              alt: 'Tactile connected infrastructure system for hosting, domains, email, backups, and security',
            },
            caption: 'Conceptual illustration · Strategy to design, build, and operation',
          }}
        >
          <Link href="/contact" className={styles.heroBtn}>
            Start a project <span aria-hidden="true">→</span>
          </Link>
        </PageHeader>

        <CapabilityJourney />

        {/* Process */}
        <section className={styles.processSection}>
          <div className="container">
            <ScrollReveal>
              <span className="eyebrow">How it works</span>
              <h2 className={styles.sectionHeading}>Four phases, with ownership clear at each one.</h2>
              <BuildCards className={styles.processGrid}>
                {process.map((item) => (
                  <div key={item.step} className={styles.processCard}>
                    <div className={styles.processStep}>{item.step}</div>
                    <h3 className={styles.processTitle}>{item.title}</h3>
                    <p className={styles.processDescription}>{item.description}</p>
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
