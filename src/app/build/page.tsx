import { Navbar } from '@/components/Navbar';
import { Portfolio } from '@/components/Portfolio';
import { Contact } from '@/components/Contact';
import { Footer } from '@/components/Footer';
import { ScrollReveal } from '@/components/ScrollReveal';
import styles from './Build.module.css';

export const metadata = {
  title: 'Ubunifu Build',
  description: 'Custom software, websites, and consulting for Tanzanian businesses. Web development, data analytics, brand design, AI solutions, and digital strategy.',
};

const services = [
  {
    number: '01',
    title: 'Web Development',
    description:
      'Professional websites and web applications — from informational sites to e-commerce platforms. Modern, mobile-responsive, with CMS so you can manage your own content.',
    tags: ['Websites', 'E-commerce', 'CMS', 'Hosting'],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    number: '02',
    title: 'Data Analytics',
    description:
      'Turn your data into decisions. Whether it\'s Excel spreadsheets or complex databases — we clean, analyse, and visualise your data with dashboards and reports.',
    tags: ['Analysis', 'Dashboards', 'Visualisation', 'KPIs'],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 20V10" />
        <path d="M12 20V4" />
        <path d="M6 20v-6" />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'Brand Design',
    description:
      'Complete visual identity — logos, style guides, marketing materials, and UI/UX design. Cohesive branding across digital and print that works for your audience.',
    tags: ['Logo', 'Brand Identity', 'Marketing', 'UI/UX'],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z" />
        <path d="m5 2 5 5" />
        <path d="M2 5l5-5" />
      </svg>
    ),
  },
  {
    number: '04',
    title: 'AI & Automation',
    description:
      'Practical AI solutions for specific business problems — predictive analytics, process automation, and custom integrations that deliver measurable results.',
    tags: ['Machine Learning', 'Automation', 'Integrations', 'AI'],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
  },
  {
    number: '05',
    title: 'Digital Strategy',
    description:
      'Assessment of your current digital maturity, implementation roadmaps, and training workshops to build your team\'s digital capabilities.',
    tags: ['Strategy', 'Training', 'Consulting', 'Roadmaps'],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
  },
];

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
          <div className="container">
            <div className={styles.header}>
              <span className={styles.heroBadge}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
                Ubunifu Build
              </span>
              <h1 className={styles.title}>
                We build it<br />
                <span className={styles.titleGradient}>for you.</span>
              </h1>
              <p className={styles.lead}>
                Not every business needs a SaaS product — sometimes you need a team that understands
                your market and can build exactly what you need. Websites, data solutions, branding,
                and digital strategy for Tanzanian businesses.
              </p>
              <a href="#contact" className={styles.heroBtn}>
                Start a project
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
              </a>
            </div>
          </div>
        </div>

        {/* Services */}
        <div className="container">
          <ScrollReveal>
            <section className={styles.servicesSection}>
              <span className="eyebrow">What we do</span>
              <h2 className={styles.sectionHeading}>Services</h2>
              <div className={styles.servicesGrid}>
                {services.map((service) => (
                  <div key={service.title} className={styles.serviceCard}>
                    <div className={styles.serviceTop}>
                      <div className={styles.serviceIcon}>{service.icon}</div>
                      <span className={styles.serviceNumber}>{service.number}</span>
                    </div>
                    <h3 className={styles.serviceTitle}>{service.title}</h3>
                    <p className={styles.serviceDescription}>{service.description}</p>
                    <div className={styles.tags}>
                      {service.tags.map((tag) => (
                        <span key={tag} className={styles.tag}>{tag}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </ScrollReveal>
        </div>

        {/* Process */}
        <section className={styles.processSection}>
          <div className="container">
            <ScrollReveal>
              <span className="eyebrow">How it works</span>
              <h2 className={styles.sectionHeading}>Our process</h2>
              <div className={styles.processGrid}>
                {process.map((item) => (
                  <div key={item.step} className={styles.processCard}>
                    <div className={styles.processStep}>{item.step}</div>
                    <h3 className={styles.processTitle}>{item.title}</h3>
                    <p className={styles.processDescription}>{item.description}</p>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* Portfolio */}
        <ScrollReveal>
          <Portfolio />
        </ScrollReveal>

        {/* CTA */}
        <div className="container">
          <ScrollReveal>
            <section className={styles.ctaSection}>
              <h2 className={styles.ctaHeading}>Have a project in mind?</h2>
              <p className={styles.ctaText}>
                Tell us what you need — we will give you an honest assessment of what is realistic
                for your budget and timeline.
              </p>
              <a href="#contact" className={styles.ctaBtn}>
                Get in touch
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
              </a>
            </section>
          </ScrollReveal>
        </div>

        <Contact />
      </main>
      <Footer />
    </>
  );
}
