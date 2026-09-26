import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/console/auth';
import { ChevronRight } from 'lucide-react';
import { Steps } from '@/components/console/Steps';
import { NewProjectForm } from './NewProjectForm';
import { STAFF_LABEL } from '@/lib/console/project-status';
import forms from '@/styles/forms.module.css';
import styles from '../../Admin.module.css';

export const metadata = { title: 'New project' };

/**
 * More work for a client. Without ?client= it starts by asking who it is for,
 * with a way to add someone new; with it, it goes straight to the project.
 */
export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; enquiry?: string }>;
}) {
  const staff = await requirePermission('projects');
  const { client: slug, enquiry: enquiryId } = await searchParams;
  if (!slug) return <ChooseClient />;

  const [client, templates, team] = await Promise.all([
    db.client.findFirst({
      where: { slug, deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        currency: true,
        projects: {
          where: { deletedAt: null },
          orderBy: { updatedAt: 'desc' },
          take: 6,
          select: { id: true, name: true, slug: true, status: true },
        },
      },
    }),
    db.projectTemplate.findMany({
      orderBy: [{ serviceLine: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, serviceLine: true, description: true, isDefault: true },
    }),
    db.staffUser.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ]);

  if (!client) notFound();

  const enquiry = enquiryId
    ? await db.enquiry.findFirst({
        where: { id: enquiryId, deletedAt: null, status: { not: 'converted' } },
        select: { id: true, subject: true, serviceLine: true },
      })
    : null;

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <Link href={`/clients/${client.slug}`} className={styles.backLink}>
            ← {client.name}
          </Link>
          <h1 className={styles.heading}>
            New <span className={styles.headingAccent}>project</span>
          </h1>
          <p className={styles.lead}>For {client.name}.</p>
        </div>
      </div>
      <Steps
        steps={[
          { key: 'client', label: 'Client' },
          { key: 'project', label: 'Project' },
        ]}
        current={1}
        hrefFor={() => '/projects/new'}
      />
      <div className={styles.split}>
        <div className={styles.splitMain}>
          <NewProjectForm
            clientId={client.id}
            clientName={client.name}
            currency={client.currency}
            templates={templates}
            team={team}
            me={staff.id}
            from={
              enquiry
                ? {
                    enquiryId: enquiry.id,
                    name: enquiry.subject.slice(0, 160),
                    // Their message is not the summary the client will see; staff write that.
                    summary: '',
                    serviceLine: enquiry.serviceLine,
                  }
                : undefined
            }
          />
        </div>

        <aside className={styles.splitAside}>
          <section className={forms.card}>
            <div className={forms.cardHeader}>
              <h2 className={forms.cardTitle}>{client.name}</h2>
              <span className={forms.cardMeta}>Billed in {client.currency}</span>
            </div>
            {client.projects.length === 0 ? (
              <p className={styles.note}>This is their first project.</p>
            ) : (
              <>
                <p className={styles.note}>Their other projects:</p>
                <ul className={styles.glance}>
                  {client.projects.map((project) => (
                    <li key={project.id}>
                      <Link href={`/projects/${project.slug}`}>
                        <span className={styles.taskText}>
                          {project.name}
                          <span className={styles.taskMeta}>{STAFF_LABEL[project.status]}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}

/** The first step: who the project is for. */
async function ChooseClient() {
  const clients = await db.client.findMany({
    where: { deletedAt: null },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { projects: { where: { deletedAt: null } } } },
    },
  });

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <Link href="/projects" className={styles.backLink}>
            ← Projects
          </Link>
          <h1 className={styles.heading}>New project</h1>
          <p className={styles.lead}>Who is it for?</p>
        </div>
      </div>

      <Steps
        steps={[
          { key: 'client', label: 'Client' },
          { key: 'project', label: 'Project' },
        ]}
        current={0}
      />

      <div className={styles.split}>
        <section className={`${forms.card} ${styles.splitMain}`}>
          <ul className={styles.glance}>
            {clients.map((client) => (
              <li key={client.id}>
                <Link href={`/projects/new?client=${client.slug}`}>
                  <span className={styles.taskText}>
                    {client.name}
                    <span className={styles.taskMeta}>
                      {client._count.projects === 0
                        ? 'No projects yet'
                        : `${client._count.projects} ${client._count.projects === 1 ? 'project' : 'projects'}`}
                    </span>
                  </span>
                  <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <aside className={styles.splitAside}>
          <section className={forms.card}>
            <div className={forms.cardHeader}>
              <h2 className={forms.cardTitle}>Someone new</h2>
            </div>
            <p className={styles.note}>
              Add them as a client first. Their first project can be set up in the same form.
            </p>
            <div className={forms.actions}>
              <Link href="/clients/new" className={forms.button}>
                Add a client
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
