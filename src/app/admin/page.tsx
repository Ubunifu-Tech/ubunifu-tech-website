import Link from 'next/link';
import { db } from '@/lib/db';
import { requireStaff } from '@/lib/console/auth';
import { formatRelative } from '@/lib/console/money';
import styles from './Admin.module.css';
import forms from '@/styles/forms.module.css';

// Absolute: a layout template does not apply to its own sibling page, so a
// plain string here would inherit the marketing site's title template.
export const metadata = { title: { absolute: 'Overview · Ubunifu Console' } };

/**
 * The desk.
 *
 * Counts only, and only the ones that mean "someone is waiting on us": a new
 * enquiry nobody has read, a client who never set up their account, a project
 * sitting in a state that needs a decision. A dashboard of totals would look
 * busier and say less.
 */
export default async function AdminHome() {
  const staff = await requireStaff();
  const now = new Date();

  const [newEnquiries, uninvited, awaitingUs, latestEnquiry, activeProjects] = await Promise.all([
    db.enquiry.count({ where: { status: 'new' } }),
    db.clientContact.count({
      where: { deletedAt: null, canSignIn: true, activatedAt: null, client: { deletedAt: null } },
    }),
    db.project.count({
      where: { deletedAt: null, status: { in: ['lead', 'proposal_draft', 'client_review'] } },
    }),
    db.enquiry.findFirst({
      where: { status: 'new' },
      orderBy: { createdAt: 'desc' },
      select: { name: true, subject: true, createdAt: true },
    }),
    db.project.count({
      where: { deletedAt: null, status: { in: ['in_progress', 'launch_ready', 'client_review'] } },
    }),
  ]);

  const waiting = [
    {
      count: newEnquiries,
      href: '/enquiries',
      singular: 'enquiry nobody has read',
      plural: 'enquiries nobody has read',
    },
    {
      count: awaitingUs,
      href: '/projects',
      singular: 'project waiting on a decision from us',
      plural: 'projects waiting on a decision from us',
    },
    {
      count: uninvited,
      href: '/clients',
      singular: 'contact who has never been invited',
      plural: 'contacts who have never been invited',
    },
  ].filter((item) => item.count > 0);

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <h1 className={styles.heading}>
            Good to see you, <span className={styles.headingAccent}>{staff.name.split(' ')[0]}</span>
          </h1>
          <p className={styles.lead}>
            {waiting.length === 0
              ? 'Nothing is waiting on you. Everything that has come in has been picked up.'
              : 'These are the things nobody has picked up yet.'}
          </p>
        </div>
        <Link href="/clients/new" className={forms.button}>
          Add a client
        </Link>
      </div>

      <div className={styles.stack}>
        {waiting.length === 0 ? (
          <p className={styles.empty}>
            A clear desk. {activeProjects} project{activeProjects === 1 ? ' is' : 's are'} in flight.
          </p>
        ) : (
          waiting.map((item) => (
            <article key={item.href} className={styles.record}>
              <div className={styles.recordHead}>
                <h2 className={styles.recordName}>
                  <Link href={item.href} className={styles.recordLink}>
                    {item.count} {item.count === 1 ? item.singular : item.plural}
                  </Link>
                </h2>
                <Link href={item.href} className={forms.link}>
                  Open
                </Link>
              </div>
              {item.href === '/enquiries' && latestEnquiry && (
                <p className={styles.recordMeta}>
                  Most recent: {latestEnquiry.name} · {latestEnquiry.subject} ·{' '}
                  {formatRelative(latestEnquiry.createdAt, now)}
                </p>
              )}
            </article>
          ))
        )}
      </div>
    </main>
  );
}
