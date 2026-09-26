import Link from 'next/link';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/console/auth';
import { liveEnquiry } from '@/lib/console/live';
import { formatDate } from '@/lib/console/money';
import { NewClientForm, type Prefill } from './NewClientForm';
import styles from '../../Admin.module.css';
import forms from '@/styles/forms.module.css';

export const metadata = { title: 'New client' };

/**
 * Manual onboarding.
 *
 * Most work does not arrive through the website form — it arrives as a call or
 * a conversation, and by the time anyone opens the console the engagement is
 * already real. This is the way in for that.
 *
 * It is also where an enquiry becomes a client. With ?enquiry=<id> the form
 * opens carrying what the website already told us: who wrote in, their email,
 * the service line their subject implies, and their own words filed into the
 * internal notes so the context does not get left behind on another screen.
 * The organisation name is deliberately NOT guessed from their email domain —
 * that name ends up on contracts and invoices, and a plausible wrong one is
 * harder to notice than an empty field.
 */
export default async function NewClientPage({
  searchParams,
}: {
  searchParams: Promise<{ enquiry?: string }>;
}) {
  const staff = await requirePermission('clients');
  const { enquiry: enquiryId } = await searchParams;

  const [templates, team, enquiry] = await Promise.all([
    db.projectTemplate.findMany({
      orderBy: [{ serviceLine: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, serviceLine: true, description: true, isDefault: true },
    }),
    db.staffUser.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    enquiryId
      ? db.enquiry.findFirst({
          where: { id: enquiryId, ...liveEnquiry },
          select: {
            id: true,
            name: true,
            email: true,
            subject: true,
            message: true,
            serviceLine: true,
            status: true,
            createdAt: true,
            clientId: true,
          },
        })
      : null,
  ]);

  // An enquiry already onboarded must not be onboarded twice.
  const usable = enquiry && !enquiry.clientId && enquiry.status !== 'converted' ? enquiry : null;

  const prefill: Prefill | undefined = usable
    ? {
        enquiryId: usable.id,
        contactName: usable.name,
        contactEmail: usable.email,
        serviceLine: usable.serviceLine ?? 'web',
        notes: `From the website enquiry on ${formatDate(usable.createdAt)}, about ${usable.subject}:\n\n${usable.message}`,
        projectName: usable.subject.slice(0, 160),
      }
    : undefined;

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <Link href={usable ? '/enquiries' : '/clients'} className={styles.backLink}>
            ← {usable ? 'Enquiries' : 'Clients'}
          </Link>
          <h1 className={styles.heading}>
            {usable ? 'Onboard' : 'New'} <span className={styles.headingAccent}>client</span>
          </h1>
          <p className={styles.lead}>
            {usable
              ? `From ${usable.name}'s enquiry. Add their organisation if they have one.`
              : 'For work that came in by phone or in person rather than through the website.'}
          </p>
        </div>
      </div>

      <div className={styles.split}>
        <div className={styles.splitMain}>
          <NewClientForm templates={templates} prefill={prefill} team={team} me={staff.id} />
        </div>

        <aside className={styles.splitAside}>
          {usable ? (
            <section className={forms.card}>
              <div className={forms.cardHeader}>
                <h2 className={forms.cardTitle}>What they wrote</h2>
                <span className={forms.cardMeta}>{formatDate(usable.createdAt)}</span>
              </div>
              <p className={styles.note}>
                {usable.name} · <a href={`mailto:${usable.email}`}>{usable.email}</a>
              </p>
              <p className={styles.asideSubject}>{usable.subject}</p>
              <p className={styles.asideMessage}>{usable.message}</p>
            </section>
          ) : (
            <section className={forms.card}>
              <div className={forms.cardHeader}>
                <h2 className={forms.cardTitle}>What this creates</h2>
              </div>
              <ul className={styles.asideList}>
                <li>The client, with their billing currency.</li>
                <li>The person you deal with, who can sign in to the portal.</li>
                <li>Their first project, with a plan to start from, if you want one now.</li>
                <li>An invitation email, only if you choose to send it.</li>
              </ul>
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}
