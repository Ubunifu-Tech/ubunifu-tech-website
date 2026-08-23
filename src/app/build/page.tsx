import { WorkPreview } from '@/components/HomePreviews';
import { CtaBand } from '@/components/CtaBand';
import { ScrollReveal } from '@/components/ScrollReveal';
import { BuildCards } from '@/components/BuildCards';
import { PageHeader } from '@/components/PageHeader';
import { ServiceCycle } from '@/components/ServiceCycle';
import { Spotlight } from '@/components/Spotlight';
import { services, type Service } from '@/content/services';
import styles from './Build.module.css';
import { pageMetadata } from '@/lib/metadata';

// Real proof (or a branded panel) for each service spotlight.
function spotlightMedia(service: Service) {
  switch (service.key) {
    case 'web':
      return {
        image: {
          src: '/work/usambara-hero.png',
          alt: 'Usambara Destination website built by Ubunifu',
          domain: 'usambaradestination.com',
        },
        overlap: { title: 'Live site', sub: 'Clear, accessible, enquiry-focused' },
      };
    case 'data':
      return {
        image: {
          src: '/work/sifa-dashboard.png',
          alt: 'Sifa intelligence dashboard with sales, stock and credit aging',
        },
        overlap: { title: 'Real dashboards', sub: 'Sales, stock and credit aging' },
      };
    case 'ai':
      return {
        image: {
          src: '/work/insight-tutor.png',
          alt: 'Ubunifu Insight tutor answering a question in Swahili',
        },
        overlap: { title: 'Answers in Swahili', sub: 'Grounded, with citations' },
      };
    case 'hosting':
      return {
        image: {
          src: '/editorial/hosting-system-art.webp',
          alt: 'Tactile connected system representing hosting, domains, professional email, backups, and security',
        },
        overlap: { title: 'One cared-for system', sub: 'Hosting, domains, email & backups' },
      };
    case 'branding':
      return {
        image: {
          src: '/editorial/brand-system-art.webp',
          alt: 'Tactile brand system translating one visual identity across coordinated print and digital touchpoints',
        },
        overlap: { title: 'Built to stay consistent', sub: 'One identity across every touchpoint' },
      };
    default:
      return {
        image: {
          src: '/editorial/software-tanzania-learning.webp',
          alt: 'Tactile workbench where research cards, modular pieces, and revision loops lead to one working assembly',
        },
        overlap: { title: 'Plan, build, support', sub: 'Roadmaps, training and advisory' },
      };
  }
}

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
          eyebrow="Consulting services"
          title="From strategy to systems built to keep evolving."
          lead="We advise, design, and build, then operate when the engagement calls for it. Bring us one focused problem or a connected set of systems. The same senior team stays close through delivery."
          artwork={{
            primary: {
              src: '/editorial/software-tanzania-learning.webp',
              alt: 'Tactile workbench showing research, modular decisions, and a working system coming together',
            },
            secondary: {
              src: '/editorial/hosting-system-art.webp',
              alt: 'Tactile connected infrastructure system for hosting, domains, email, backups, and security',
            },
            caption: 'Strategy → design → build → operate',
          }}
        >
          <a href="/contact" className={styles.heroBtn}>
            Start a project <span aria-hidden="true">→</span>
          </a>
        </PageHeader>

        <section className={styles.cycleSection} aria-labelledby="capability-cycle-title">
          <div className="container">
            <ScrollReveal className={styles.cycleIntro}>
              <span className={styles.cycleEyebrow}>Connected capabilities</span>
              <h2 id="capability-cycle-title" className={styles.cycleHeading}>
                Six disciplines. One accountable team.
              </h2>
              <p className={styles.cycleLead}>
                Choose any starting point. The sequence shows how each capability
                connects to the wider system—and where we can go deeper together.
              </p>
            </ScrollReveal>
            <ServiceCycle />
          </div>
        </section>

        {/* Services — spotlight rows */}
        <section className={styles.servicesSection}>
          <div className="container">
            <ScrollReveal>
              <span className="eyebrow">Capability detail</span>
              <h2 className={styles.sectionHeading}>Go deeper into each discipline</h2>
              <p className={styles.servicesSub}>
                Use one service or combine several around the outcome. We will
                tell you when a simpler answer is enough.
              </p>
            </ScrollReveal>

            <div className={styles.spotlights}>
              {services.map((service, index) => (
                <Spotlight
                  key={service.key}
                  id={service.key}
                  index={index + 1}
                  eyebrow={service.summary}
                  title={service.title}
                  body={service.description}
                  items={service.items}
                  reversed={index % 2 === 1}
                  {...spotlightMedia(service)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Process */}
        <section className={styles.processSection}>
          <div className="container">
            <ScrollReveal>
              <span className="eyebrow">How it works</span>
              <h2 className={styles.sectionHeading}>A delivery loop, not a handoff</h2>
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
