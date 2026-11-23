import Link from 'next/link';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/console/auth';
import { billableLines } from '@/lib/console/billing';
import { formatMoney } from '@/lib/console/money';
import { statusesIn } from '@/lib/console/stages';
import styles from '../../Admin.module.css';
import table from '@/styles/table.module.css';

export const metadata = { title: 'New invoice' };

/**
 * Raising an invoice without first finding the project: every open project
 * that has something to invoice now, with what it comes to. Choosing one
 * opens its fees with the lines already ticked.
 */
export default async function NewInvoicePage() {
  await requirePermission('invoices');
  const projects = await db.project.findMany({
    where: { deletedAt: null, client: { deletedAt: null }, status: { notIn: ['closed', 'cancelled'] } },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: { id: true, slug: true, name: true, reference: true, currency: true, status: true, client: { select: { name: true } } },
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

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <Link href="/invoices" className={styles.backLink}>
            ← Invoices
          </Link>
          <h1 className={styles.heading}>New invoice</h1>
          <p className={styles.lead}>An invoice is raised from a project’s fees. Choose the project.</p>
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
                    <p className={table.emptyTitle}>Nothing can be invoiced right now.</p>
                    <p className={table.emptyHint}>
                      Every fee is invoiced in full or renews later. A fee with no price, or a monthly or yearly fee
                      with no first payment date, is set on its project’s Fees and billing tab.
                    </p>
                  </td>
                </tr>
              ) : (
                rows.map(({ project, count, usage, total }) => (
                  <tr key={project.id} className={table.tr}>
                    <td className={`${table.td} ${table.primary}`}>
                      <Link href={`/projects/${project.slug}?tab=fees#raise-invoice`} className={table.link}>
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
                      <Link href={`/projects/${project.slug}?tab=fees#raise-invoice`} className={table.action}>
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
