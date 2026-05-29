import { Navbar } from '@/components/Navbar';
import { WorkPreview } from '@/components/HomePreviews';
import { Footer } from '@/components/Footer';
import { ScrollReveal } from '@/components/ScrollReveal';
import { BuildCards } from '@/components/BuildCards';
import { Topography } from '@/components/Topography';
import { CodeWindow } from '@/components/CodeWindow';
import { services } from '@/content/services';
import styles from './Build.module.css';

export const metadata = {
  title: 'Services',
  description: 'Web development, data analytics, intelligent automation, branding, and digital strategy for businesses and organisations across Tanzania.',
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
      <Navbar />
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
                  Five things we do well: web, data, AI, branding, and strategy.
                  Pick one, or let us handle the whole digital side of your business
                  and run it for you.
                </p>
                <a href="/contact" className={styles.heroBtn}>
                  Start a project
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
                </a>
              </div>

              <div className={styles.heroVisual}>
                <CodeWindow />
              </div>
            </div>
          </div>
        </div>

        {/* Services */}
        <div className="container">
          <ScrollReveal>
            <section className={styles.servicesSection}>
              <span className="eyebrow">What we do</span>
              <h2 className={styles.sectionHeading}>Five ways we help</h2>
              <BuildCards className={styles.servicesGrid}>
                {services.map((service, index) => {
                  const Icon = service.icon;
                  return (
                    <div key={service.key} className={styles.serviceCard}>
                      <div className={styles.serviceTop}>
                        <div className={styles.serviceIcon}>
                          <Icon size={22} />
                        </div>
                        <span className={styles.serviceNumber}>
                          {String(index + 1).padStart(2, '0')}
                        </span>
                      </div>
                      <h3 className={styles.serviceTitle}>{service.title}</h3>
                      <p className={styles.serviceSummary}>{service.summary}</p>
                      <p className={styles.serviceDescription}>{service.description}</p>
                      <ul className={styles.serviceItems}>
                        {service.items.map((item) => (
                          <li key={item} className={styles.serviceItem}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </BuildCards>
            </section>
          </ScrollReveal>
        </div>

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
      <Footer />
    </>
  );
}
