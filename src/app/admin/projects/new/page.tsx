import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requireStaff } from '@/lib/console/auth';
import { NewProjectForm } from './NewProjectForm';
import styles from '../../Admin.module.css';

export const metadata = { title: 'New project' };

/**
 * More work for a client already on the books.
 *
 * Reached with ?client=<slug>, because a project without a client is not a
 * thing this system can hold — and picking the client from a list here would
 * duplicate the onboarding form for the one case it does not cover.
 */
export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  await requireStaff();
  const { client: slug } = await searchParams;
  if (!slug) notFound();

  const [client, templates] = await Promise.all([
    db.client.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true, name: true, slug: true, currency: true },
    }),
    db.projectTemplate.findMany({
      orderBy: [{ serviceLine: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, serviceLine: true, description: true, isDefault: true },
    }),
  ]);

  if (!client) notFound();

  return (
    <main className={`${styles.page} ${styles.medium}`}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <Link href={`/clients/${client.slug}`} className={styles.backLink}>
            ← {client.name}
          </Link>
          <h1 className={styles.heading}>
            New <span className={styles.headingAccent}>project</span>
          </h1>
          <p className={styles.lead}>
            For {client.name}, who is already on the books. Their details, contacts and billing
            currency carry over.
          </p>
        </div>
      </div>
      <NewProjectForm
        clientId={client.id}
        clientName={client.name}
        currency={client.currency}
        templates={templates}
      />
    </main>
  );
}
