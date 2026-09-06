import Link from 'next/link';
import { CtaBand } from '@/components/CtaBand';
import { PageHeader } from '@/components/PageHeader';
import styles from './Careers.module.css';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata({
  title: 'Careers',
  description: 'Ubunifu Technologies has no advertised vacancies at present. Confirmed opportunities and application instructions will be published here.',
  path: '/careers',
});

const capabilityAreas = [
  {
    title: 'Software engineering',
    description: 'Web applications and services across Python, TypeScript, FastAPI, and Next.js.',
  },
  {
    title: 'Product design',
    description: 'Clear, accessible product experiences for web applications and complex workflows.',
  },
  {
    title: 'Data and applied AI',
    description: 'Data pipelines, document processing, retrieval systems, and practical automation.',
  },
  {
    title: 'Partnerships',
    description: 'Thoughtful business development and customer partnerships in Tanzania and East Africa.',
  },
];

export default function CareersPage() {
  return (
    <>
      <main className={styles.main}>
        <PageHeader
          variant="human"
          register={['Craft', 'Judgment', 'Collaboration']}
          eyebrow="Careers"
          title="Work at Ubunifu"
          lead="We grow deliberately and publish confirmed opportunities with their specific requirements and application process on this page."
          artwork={{
            primary: {
              src: '/editorial/brand-system-art.webp',
              alt: 'Tactile system showing one clear idea applied consistently across many touchpoints',
            },
            caption: 'Conceptual illustration · Craft, judgment, and close collaboration',
          }}
        />
        <div className="container">
          <div className={styles.openSection}>
            <div className={styles.noRoles}>
              <h2 className={styles.noRolesTitle}>No open roles right now</h2>
              <p className={styles.noRolesText}>
                We are not currently advertising jobs, internships, or contract roles. If you
                would still like to make a general introduction, send a short note to{' '}
                <a href="mailto:info@ubunifutech.com" className={styles.emailLink}>info@ubunifutech.com</a>{' '}
                with the kind of work you do or a link to your portfolio. A general introduction
                is not an application, and we cannot promise a reply or future consideration.
              </p>
              <p className={styles.privacyNote}>
                Please do not email identity documents, financial details, health information, or
                other sensitive personal information. See our <Link href="/privacy">privacy notice</Link>{' '}
                for how we handle careers enquiries.
              </p>
              <Link href="/contact" className={styles.contactBtn}>
                General enquiry
              </Link>
            </div>
          </div>

          <section className={styles.futureSection} aria-labelledby="capability-areas-heading">
            <h2 id="capability-areas-heading" className={styles.futureHeading}>
              Areas where we may add capacity
            </h2>
            <p className={styles.futureIntro}>
              These are examples of capabilities relevant to our work, not current vacancies or a
              commitment to hire. Any confirmed role may use different titles or requirements.
            </p>
            <div className={styles.rolesGrid}>
              {capabilityAreas.map((area) => (
                <div key={area.title} className={styles.roleCard}>
                  <h3 className={styles.roleTitle}>{area.title}</h3>
                  <p className={styles.roleDesc}>{area.description}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
      <CtaBand />
    </>
  );
}
