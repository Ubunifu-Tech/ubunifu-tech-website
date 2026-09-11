import Link from 'next/link';
import { PageAtmosphere } from '@/components/PageAtmosphere';
import { PageHeader } from '@/components/PageHeader';
import styles from './Careers.module.css';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata({
  title: 'Careers',
  description: 'Ubunifu Technologies has no advertised vacancies at present. Confirmed opportunities and application instructions will be published here.',
  path: '/careers',
});

export default function CareersPage() {
  return (
    <>
      <PageAtmosphere />
      <main data-atmosphere className={styles.main}>
        <PageHeader
          ambient={false}
          scene="careers"
          compact
          eyebrow="Careers"
          title="Work at Ubunifu"
          lead="We publish confirmed vacancies and application details here."
        />
        <div className="container">
          <div className={styles.openSection}>
            <div className={styles.noRoles}>
              <h2 className={styles.noRolesTitle}>No open roles right now</h2>
              <p className={styles.noRolesText}>
                We are not currently advertising jobs, internships, or contract roles. If you
                would still like to make a general introduction, send a short note to{' '}
                <a href="mailto:info@ubunifutech.com" className={styles.emailLink}>info@ubunifutech.com</a>{' '}
                with the kind of work you do or a link to your portfolio. We can’t guarantee a reply.
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

        </div>
      </main>
    </>
  );
}
