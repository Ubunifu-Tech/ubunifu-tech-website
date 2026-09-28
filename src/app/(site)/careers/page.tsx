import Link from 'next/link';
import { PageAtmosphere } from '@/components/PageAtmosphere';
import { PageHeader } from '@/components/PageHeader';
import styles from './Careers.module.css';
import { careers } from '@/content/careers';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata({
  title: 'Careers',
  description: 'Ubunifu Technologies has no advertised vacancies at present. Confirmed opportunities and application instructions will be published here.',
  path: '/careers',
});

export default function CareersPage() {
  const [beforeEmail, afterEmail] = careers.intro.split('{email}');
  return (
    <>
      <PageAtmosphere />
      <main data-atmosphere className={styles.main}>
        <PageHeader
          scene="careers"
          eyebrow="Careers"
          title="Work at Ubunifu"
          lead="We publish confirmed vacancies and application details here."
        />
        <div className="container">
          <div className={styles.openSection}>
            <div className={styles.noRoles}>
              <h2 className={styles.noRolesTitle}>{careers.noRoles}</h2>
              <p className={styles.noRolesText}>
                {careers.note} {beforeEmail}
                <a href={`mailto:${careers.introEmail}`} className={styles.emailLink}>{careers.introEmail}</a>
                {afterEmail}
              </p>
              <p className={styles.privacyNote}>
                Please do not email identity documents, financial details, health information, or
                other sensitive personal information. See our <Link href="/privacy">privacy notice</Link>{' '}
                for how we handle careers enquiries.
              </p>
              <Link href="/contact?subject=Careers" className={styles.contactBtn}>
                General enquiry
              </Link>
            </div>
          </div>

        </div>
      </main>
    </>
  );
}
