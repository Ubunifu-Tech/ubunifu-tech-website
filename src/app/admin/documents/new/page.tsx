import Link from 'next/link';
import { db } from '@/lib/db';
import { can, requirePermission } from '@/lib/console/auth';
import { statusesIn } from '@/lib/console/stages';
import { StartDocument } from './StartDocument';
import styles from '../../Admin.module.css';
import forms from '@/styles/forms.module.css';

export const metadata = { title: 'New document' };

/**
 * Starting a proposal or an agreement without first finding its project. It
 * is saved as a draft and opens on its own page; nothing goes to the client
 * from here.
 */
export default async function NewDocumentPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const staff = await requirePermission('documents');
  const { project } = await searchParams;
  const projects = await db.project.findMany({
    where: { deletedAt: null, client: { deletedAt: null }, status: { notIn: ['closed', 'cancelled', ...statusesIn('delivered')] } },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: { id: true, slug: true, name: true, reference: true, client: { select: { name: true } } },
  });

  return (
    <main className={`${styles.page} ${styles.medium}`}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <Link href="/documents" className={styles.backLink}>
            ← Documents
          </Link>
          <h1 className={styles.heading}>New document</h1>
          <p className={styles.lead}>A proposal, an agreement or another document for a project. It starts as a draft.</p>
        </div>
      </div>

      <section className={forms.card}>
        {projects.length === 0 ? (
          <p className={styles.note}>
            A document belongs to a project, and there is no open project yet.{' '}
            {can(staff, 'projects') ? <Link href="/projects/new">Start one</Link> : 'Someone who runs projects can start one.'}
          </p>
        ) : (
          <StartDocument
            projects={projects.map((option) => ({
              id: option.id,
              name: option.name,
              label: `${option.name} · ${option.client.name} · ${option.reference}`,
            }))}
            chosen={projects.find((option) => option.slug === project)?.id ?? (projects.length === 1 ? projects[0]!.id : '')}
          />
        )}
      </section>
    </main>
  );
}
