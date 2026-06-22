import { WorkPreview } from '@/components/HomePreviews';
import { CtaBand } from '@/components/CtaBand';
import { ScrollReveal } from '@/components/ScrollReveal';
import { BuildCards } from '@/components/BuildCards';
import { Topography } from '@/components/Topography';
import { ServiceConstellation } from '@/components/visuals/ServiceConstellation';
import { Spotlight } from '@/components/Spotlight';
import { services, type Service } from '@/content/services';
import styles from './Build.module.css';

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
        overlap: { title: 'Live site', sub: 'Fast, accessible, SEO-strong' },
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
        panelIcon: service.icon,
        panelChips: ['cPanel hosting', 'SSL included', 'Backups', 'Local support'],
        overlap: { title: 'We keep you online', sub: 'Hosting, domains & email, managed' },
      };
    case 'branding':
      return {
        panelIcon: service.icon,
        panelChips: ['Logo design', 'Banners & flyers', 'Social graphics', 'Style guides'],
      };
    default:
      return {
        panelIcon: service.icon,
        panelChips: ['Roadmap', 'Maturity assessment', 'Training', 'Advisory'],
      };
  }
}

export const metadata = {
  title: 'Services',
  description: 'Web development, hosting, domain management, professional email, data analytics, intelligent automation, branding, and digital strategy for businesses and organisations across Tanzania.',
};

const process = [
  {
    step: '1',
    title: 'Tell us what you need',
    description: 'We start with a conversation. You tell us the problem, we figure out the right solution together.',
  },
  {
    step: '2',
    title: 'We scope and plan',
    description: 'You get a clear timeline, deliverables, and honest pricing. No surprises.',
  },
  {
    step: '3',
    title: 'We build and deliver',
    description: 'We ship iteratively, keeping you involved. You get working software, not just mockups.',
  },
];

export default function BuildPage() {
  return (
    <>
      <main className={styles.main}>
        {/* Hero */}
        <div className={styles.heroSection}>
          <div className={styles.heroBg} aria-hidden="true" />
          <div className={styles.heroDots} aria-hidden="true" />
          <Topography className={styles.heroTopo} />
          <div className="grain" />

          <div className="container">
            <div className={styles.heroGrid}>
              <div className={styles.header}>
                <span className={styles.heroBadge}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                  </svg>
                  Our services
                </span>
                <h1 className={styles.title}>
                  Everything your<br />
                  <span className={styles.titleGradient}>digital side needs.</span>
                </h1>
                <p className={styles.lead}>
                  Six things we do well: web, hosting, data, AI, branding, and
                  strategy. Pick one, or let us handle the whole digital side of
                  your business &mdash; build it, host it, and run it for you.
                </p>
                <a href="/contact" className={styles.heroBtn}>
                  Start a project
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
                </a>
              </div>

              <div className={styles.heroVisual}>
                <ServiceConstellation />
              </div>
            </div>
          </div>
        </div>

        {/* Services — spotlight rows */}
        <section className={styles.servicesSection}>
          <div className="container">
            <ScrollReveal>
              <span className="eyebrow">What we do</span>
              <h2 className={styles.sectionHeading}>Six ways we help you grow</h2>
              <p className={styles.servicesSub}>
                Pick one, or hand us the whole digital side. Each of these is
                something we run for clients today.
              </p>
              <div className={styles.jump}>
                {services.map((s) => (
                  <a key={s.key} href={`#${s.key}`} className={styles.jumpChip}>
                    {s.title}
                  </a>
                ))}
              </div>
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
              <h2 className={styles.sectionHeading}>Our process</h2>
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
