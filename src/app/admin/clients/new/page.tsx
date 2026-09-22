import Link from 'next/link';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/console/auth';
import { formatDate } from '@/lib/console/money';
import { NewClientForm, type Prefill } from './NewClientForm';
import styles from '../../Admin.module.css';

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
  await requirePermission('clients');
  const { enquiry: enquiryId } = await searchParams;

  const [templates, enquiry] = await Promise.all([
    db.projectTemplate.findMany({
      orderBy: [{ serviceLine: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, serviceLine: true, description: true, isDefault: true },
    }),
    enquiryId
      ? db.enquiry.findUnique({
          where: { id: enquiryId },
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
        notes: `From the website enquiry on ${formatDate(usable.createdAt)} — ${usable.subject}:\n\n${usable.message}`,
      }
    : undefined;

  return (
    <main className={`${styles.page} ${styles.medium}`}>
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
              ? `Turning ${usable.name}'s enquiry into a client. We still need the organisation's name — the enquiry only told us who wrote in.`
              : 'For work that came in by phone or in person rather than through the website.'}
          </p>
        </div>
      </div>
      <NewClientForm templates={templates} prefill={prefill} />
    </main>
  );
}
