import Link from 'next/link';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/console/auth';
import { formatMoney, formatShortDate } from '@/lib/console/money';
import styles from '../Admin.module.css';
import table from '@/styles/table.module.css';

export const metadata = { title: 'Removed clients' };

const OWING = ['sent', 'part_paid', 'overdue'] as const;

/**
 * Clients who were removed, newest first.
 *
 * Removal keeps every record, and this is where they are found again: each
 * client opens onto its invoices, receipts and signed documents, and can be
 * brought back from there.
 */
export default async function RemovedClients() {
  await requirePermission('clients');

  const clients = await db.client.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: 'desc' },
    take: 300,
    select: {
      id: true,
      name: true,
      slug: true,
      country: true,
      deletedAt: true,
      _count: { select: { projects: true, invoices: true } },
      invoices: {
        where: { status: { in: [...OWING] } },
        select: { totalMinor: true, paidMinor: true, currency: true },
      },
    },
  });

  // Who removed each, from the record of it.
  const removals = await db.auditEvent.findMany({
    where: { action: 'client.removed', entityId: { in: clients.map((client) => client.id) } },
    orderBy: { createdAt: 'desc' },
    select: { entityId: true, actorId: true },
  });
  const staff = await db.staffUser.findMany({
    where: { id: { in: removals.flatMap((event) => (event.actorId ? [event.actorId] : [])) } },
    select: { id: true, name: true },
  });
  const removedBy = new Map<string, string>();
  for (const event of removals) {
    if (removedBy.has(event.entityId)) continue;
    const name = staff.find((person) => person.id === event.actorId)?.name;
    if (name) removedBy.set(event.entityId, name);
  }

  const owed = (invoices: { totalMinor: number; paidMinor: number; currency: string }[]) => {
    const byCurrency = new Map<string, number>();
    for (const invoice of invoices) {
      const left = invoice.totalMinor - invoice.paidMinor;
      if (left > 0)
        byCurrency.set(invoice.currency, (byCurrency.get(invoice.currency) ?? 0) + left);
    }
    return [...byCurrency].map(([currency, amount]) => formatMoney(amount, currency)).join(' + ');
  };

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <Link href="/clients" className={styles.backLink}>
            ← Clients
          </Link>
          <h1 className={styles.heading}>Removed clients</h1>
        </div>
      </div>

      <div className={table.frame}>
        <div className={table.scroll}>
          <table className={table.table}>
            <thead>
              <tr>
                <th className={table.th} scope="col">
                  Client
                </th>
                <th className={table.th} scope="col">
                  Country
                </th>
                <th className={table.th} scope="col">
                  Removed
                </th>
                <th className={table.th} scope="col">
                  Removed by
                </th>
                <th className={`${table.th} ${table.numericHead}`} scope="col">
                  Projects
                </th>
                <th className={`${table.th} ${table.numericHead}`} scope="col">
                  Invoices
                </th>
                <th className={`${table.th} ${table.numericHead}`} scope="col">
                  Unpaid
                </th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr>
                  <td className={table.emptyCell} colSpan={7}>
                    <p className={table.emptyTitle}>No removed clients.</p>
                  </td>
                </tr>
              ) : (
                clients.map((client) => {
                  const unpaid = owed(client.invoices);
                  return (
                    <tr key={client.id} className={table.tr}>
                      <td className={`${table.td} ${table.primary}`}>
                        <Link href={`/removed/${client.slug}`} className={table.link}>
                          {client.name}
                        </Link>
                      </td>
                      <td className={`${table.td} ${table.nowrap}`}>{client.country}</td>
                      <td className={`${table.td} ${table.nowrap}`}>
                        {formatShortDate(client.deletedAt)}
                      </td>
                      <td className={`${table.td} ${table.nowrap}`}>
                        {removedBy.get(client.id) ?? <span className={table.muted}>Unknown</span>}
                      </td>
                      <td className={`${table.td} ${table.numeric}`}>{client._count.projects}</td>
                      <td className={`${table.td} ${table.numeric}`}>{client._count.invoices}</td>
                      <td className={`${table.td} ${table.numeric}`}>
                        {unpaid ? (
                          <span className={table.late}>{unpaid}</span>
                        ) : (
                          <span className={table.muted}>None</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
