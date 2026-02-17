import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import styles from './Careers.module.css';

export const metadata = {
  title: 'Careers',
  description: 'Join Ubunifu Technologies. We build SaaS products for African businesses. Open roles will be posted here as we grow.',
};

const futureRoles = [
  {
    title: 'Software Engineer',
    description: 'Python, FastAPI, TypeScript, Next.js. Experience with AI/ML systems a bonus.',
  },
  {
    title: 'Product Designer',
    description: 'UI/UX for web applications. Strong craft, no-nonsense approach to complexity.',
  },
  {
    title: 'Data Engineer',
    description: 'Pipelines, vector databases, document processing. Experience with RAG systems preferred.',
  },
  {
    title: 'Sales & Partnerships',
    description: 'Tanzania and East Africa market. Swahili required. B2B SaaS experience a plus.',
  },
];

export default function CareersPage() {
  return (
    <>
      <Navbar />
      <main className={styles.main}>
        <div className="container">
          <div className={styles.header}>
            <span className="eyebrow">Careers</span>
            <h1 className={styles.title}>Work at Ubunifu</h1>
            <p className={styles.lead}>
              We are a small team building SaaS products for African businesses, starting in Tanzania.
              We move deliberately, ship real things, and focus on work that matters.
            </p>
          </div>

          <div className={styles.openSection}>
            <div className={styles.noRoles}>
              <h2 className={styles.noRolesTitle}>No open roles right now</h2>
              <p className={styles.noRolesText}>
                We are heads-down building. When we are ready to hire, we will post roles here.
                If you want to be notified, send a brief note to{' '}
                <a href="mailto:info@ubunifutech.com" className={styles.emailLink}>info@ubunifutech.com</a>{' '}
                with the kind of work you do.
              </p>
              <Link href="/#contact" className={styles.contactBtn}>
                Get in touch
              </Link>
            </div>
          </div>

          <div className={styles.futureSection}>
            <h2 className={styles.futureHeading}>Roles we will hire for as we grow</h2>
            <div className={styles.rolesGrid}>
              {futureRoles.map((role) => (
                <div key={role.title} className={styles.roleCard}>
                  <h3 className={styles.roleTitle}>{role.title}</h3>
                  <p className={styles.roleDesc}>{role.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
