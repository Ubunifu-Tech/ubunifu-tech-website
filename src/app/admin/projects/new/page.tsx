import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { can, requirePermission } from '@/lib/console/auth';
import { ClientPicker } from '@/components/console/ClientPicker';
import { NewProjectForm } from './NewProjectForm';
import { STAGE_LABEL, STAGE_OF } from '@/lib/console/stages';
import forms from '@/styles/forms.module.css';
import styles from '../../Admin.module.css';

export const metadata = { title: 'New project' };

/**
 * More work for a client. Without ?client= it asks who it is for, with a way
 * to add someone new; with it, it is the project form.
 */
export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; enquiry?: string }>;
}) {
  const staff = await requirePermission('projects');
  const { client: slug, enquiry: enquiryId } = await searchParams;
  if (!slug) return <ChooseClient mayAddClients={can(staff, 'clients')} enquiryId={enquiryId} />;

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
      select: { id: true, name: true, serviceLine: true, isDefault: true },
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
          <h1 className={styles.heading}>New project</h1>
        </div>
      </div>
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
                          <span className={styles.taskMeta}>{STAGE_LABEL[STAGE_OF[project.status]]}</span>
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

/** Who the project is for, before the form. */
async function ChooseClient({ mayAddClients, enquiryId }: { mayAddClients: boolean; enquiryId?: string }) {
  const clients = await db.client.findMany({
    where: { deletedAt: null },
    orderBy: { name: 'asc' },
    select: {
      name: true,
      slug: true,
      _count: { select: { projects: { where: { deletedAt: null } } } },
    },
  });
  const carry = enquiryId ? `&enquiry=${encodeURIComponent(enquiryId)}` : '';

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <Link href="/projects" className={styles.backLink}>
            ← Projects
          </Link>
          <h1 className={styles.heading}>New project</h1>
          <p className={styles.lead}>Choose the client.</p>
        </div>
        {mayAddClients && (
          <div className={styles.headActions}>
            <Link href={`/clients/new${enquiryId ? `?enquiry=${encodeURIComponent(enquiryId)}` : ''}`} className={`${forms.button} ${forms.quiet}`}>
              New client
            </Link>
          </div>
        )}
      </div>

      <section className={forms.card}>
        <ClientPicker
          clients={clients.map((client) => ({
            name: client.name,
            slug: client.slug,
            meta:
              client._count.projects === 0
                ? 'No projects yet'
                : `${client._count.projects} ${client._count.projects === 1 ? 'project' : 'projects'}`,
          }))}
          href={`/projects/new?client=:client${carry}`}
          autoFocus
        />
      </section>
    </main>
  );
}
