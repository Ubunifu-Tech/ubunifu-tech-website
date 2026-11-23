import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/console/auth';
import { billableLines } from '@/lib/console/billing';
import { daysFromToday, formatMoney, toDateInputValue } from '@/lib/console/money';
import { getOrg } from '@/lib/console/org';
import { statusesIn } from '@/lib/console/stages';
import { RaiseInvoice } from '../RaiseInvoice';
import { linesToRaise } from '../raise-lines';
import styles from '../../Admin.module.css';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';

export const metadata = { title: 'New invoice' };

const projectFacts = {
  id: true,
  slug: true,
  name: true,
  reference: true,
  currency: true,
  status: true,
  client: { select: { name: true, slug: true } },
} as const;

/**
 * Raising an invoice from wherever the thought arrives.
 *
 * An invoice is always for one project's fees. Opened for a project, or for a
 * client with one project to bill, this is the form itself: tick the fees,
 * set the date, raise the draft. Otherwise it lists what is ready to invoice,
 * and choosing a row opens that form here.
 */
export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; project?: string }>;
}) {
  await requirePermission('invoices');
  const { client: clientSlug, project: projectSlug } = await searchParams;

  const client = clientSlug
    ? await db.client.findFirst({
        where: { slug: clientSlug, deletedAt: null },
        select: { id: true, name: true, slug: true },
      })
    : null;
  if (clientSlug && !client) notFound();

  if (projectSlug) {
    const project = await db.project.findFirst({
      where: { slug: projectSlug, deletedAt: null, client: { deletedAt: null } },
      select: projectFacts,
    });
    if (!project) notFound();
    return <RaiseFor project={project} back={client ?? project.client} />;
  }

  const projects = await db.project.findMany({
    where: {
      deletedAt: null,
      client: { deletedAt: null },
      status: { notIn: ['closed', 'cancelled'] },
      ...(client ? { clientId: client.id } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: projectFacts,
  });
  const delivered: string[] = statusesIn('delivered');
  const rows = (
    await Promise.all(
      projects.map(async (project) => {
        const lines = await billableLines(project.id);
        const priced = lines.filter((line) => line.amountMinor > 0 && !line.usage);
        const usage = lines.filter((line) => line.usage).length;
        return {
          project,
          count: priced.length + usage,
          usage,
          total: priced.reduce((sum, line) => sum + line.amountMinor, 0),
        };
      }),
    )
  )
    // A finished project is listed only while it still has something to bill.
    .filter((row) => row.count > 0 && (row.total > 0 || !delivered.includes(row.project.status)));

  // One project to bill for this client: there is nothing to choose.
  if (client && rows.length === 1) {
    return <RaiseFor project={rows[0]!.project} back={client} />;
  }

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          {client ? (
            <Link href={`/clients/${client.slug}`} className={styles.backLink}>
              ← {client.name}
            </Link>
          ) : (
            <Link href="/invoices" className={styles.backLink}>
              ← Invoices
            </Link>
          )}
          <h1 className={styles.heading}>New invoice</h1>
          <p className={styles.lead}>
            An invoice is raised from a project’s fees.
            {rows.length > 0 && ` Choose the project${client ? ` for ${client.name}` : ''}.`}
          </p>
        </div>
      </div>

      <div className={table.frame}>
        <div className={table.toolbar}>
          <div className={table.toolbarText}>
            <h2 className={table.title}>Ready to invoice</h2>
            <span className={table.count}>{rows.length}</span>
          </div>
        </div>
        <div className={table.scroll}>
          <table className={table.table}>
            <thead>
              <tr>
                <th className={table.th} scope="col">Project</th>
                <th className={table.th} scope="col">Client</th>
                <th className={table.th} scope="col">Lines</th>
                <th className={`${table.th} ${table.numericHead}`} scope="col">Comes to</th>
                <th className={`${table.th} ${table.actionsHead}`} scope="col">
                  <span className={table.muted}>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className={table.emptyCell} colSpan={5}>
                    <p className={table.emptyTitle}>
                      {client
                        ? `Nothing for ${client.name} can be invoiced right now.`
                        : 'Nothing can be invoiced right now.'}
                    </p>
                    <p className={table.emptyHint}>
                      {client && projects.length === 0
                        ? 'They have no open project. Start one and add its fees, then raise the invoice here.'
                        : 'Every fee is invoiced in full or renews later. A fee with no price, or a monthly or yearly fee with no first payment date, is set on its project’s Fees and billing tab.'}
                    </p>
                    {client &&
                      projects.map((project) => (
                        <p key={project.id} className={table.emptyHint}>
                          <Link href={`/projects/${project.slug}?tab=fees`} className={table.action}>
                            Fees for {project.name}
                          </Link>
                        </p>
                      ))}
                  </td>
                </tr>
              ) : (
                rows.map(({ project, count, usage, total }) => (
                  <tr key={project.id} className={table.tr}>
                    <td className={`${table.td} ${table.primary}`}>
                      <Link href={`/invoices/new?project=${project.slug}`} className={table.link}>
                        {project.name}
                      </Link>
                      <span className={table.sub}>{project.reference}</span>
                    </td>
                    <td className={table.td}>{project.client.name}</td>
                    <td className={`${table.td} ${table.nowrap}`}>
                      {count}
                      {usage > 0 && <span className={table.sub}>{usage} by usage</span>}
                    </td>
                    <td className={`${table.td} ${table.numeric}`}>
                      {total > 0 ? formatMoney(total, project.currency) : <span className={table.muted}>Typed in</span>}
                    </td>
                    <td className={`${table.td} ${table.actions}`}>
                      <Link href={`/invoices/new?project=${project.slug}`} className={table.action}>
                        Raise it
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

/** The form for one project: its fees not yet invoiced, ticked, with a due date. */
async function RaiseFor({
  project,
  back,
}: {
  project: { id: string; slug: string; name: string; reference: string; client: { name: string; slug: string } };
  back: { name: string; slug: string };
}) {
  const [billable, org] = await Promise.all([billableLines(project.id), getOrg()]);
  const lines = linesToRaise(billable);

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <Link href={`/clients/${back.slug}`} className={styles.backLink}>
            ← {back.name}
          </Link>
          <h1 className={styles.heading}>New invoice</h1>
          <p className={styles.facts}>
            <span>
              <span className={styles.factLabel}>For</span> {project.client.name}
            </span>
            <span>
              <span className={styles.factLabel}>Project</span>{' '}
              <Link href={`/projects/${project.slug}`}>{project.name}</Link>
            </span>
            <span>{project.reference}</span>
          </p>
        </div>
      </div>

      <section className={forms.card}>
        <div className={forms.cardHeader}>
          <h2 className={forms.cardTitle}>What to invoice</h2>
          <span className={forms.cardMeta}>Fees not yet invoiced</span>
        </div>
        {lines.length === 0 ? (
          <>
            <p className={styles.note}>
              Nothing on this project can be invoiced right now. Every fee is invoiced in full or
              renews later. A fee with no price, or a monthly or yearly fee with no first payment
              date, has to be set first.
            </p>
            <div className={forms.actions}>
              <Link href={`/projects/${project.slug}?tab=fees`} className={`${forms.button} ${forms.quiet}`}>
                Open its fees
              </Link>
            </div>
          </>
        ) : (
          <RaiseInvoice
            projectId={project.id}
            lines={lines}
            defaultDue={toDateInputValue(daysFromToday(org.paymentTermsDays))}
            termsDays={org.paymentTermsDays}
          />
        )}
      </section>
    </main>
  );
}
