import Link from 'next/link';
import { db } from '@/lib/db';
import { requireStaff } from '@/lib/console/auth';
import { formatMoney, formatRelative, formatShortDate } from '@/lib/console/money';
import styles from '../Admin.module.css';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';

export const metadata = { title: 'Clients' };

export default async function ClientsPage() {
  await requireStaff();
  const now = new Date();

  const clients = await db.client.findMany({
    where: { deletedAt: null },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      country: true,
      currency: true,
      createdAt: true,
      contacts: {
        where: { deletedAt: null },
        orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
        select: { id: true, name: true, email: true, activatedAt: true, canSignIn: true },
      },
      projects: {
        where: { deletedAt: null },
        select: {
          status: true,
          currency: true,
          lineItems: {
            where: { status: { in: ['planned', 'active'] } },
            select: { amountMinor: true, quantity: true, currency: true },
          },
        },
      },
    },
  });

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <h1 className={styles.heading}>
            Clients <span className={styles.headingAccent}>and contacts</span>
          </h1>
          <p className={styles.lead}>
            Everyone we work for. Open a client to see their projects, their money and everything
            that has passed between us.
          </p>
        </div>
        <Link href="/clients/new" className={forms.button}>
          Add a client
        </Link>
      </div>

      <div className={table.frame}>
        <div className={table.toolbar}>
          <div className={table.toolbarText}>
            <h2 className={table.title}>All clients</h2>
            <span className={table.count}>
              {clients.length} {clients.length === 1 ? 'client' : 'clients'}
            </span>
          </div>
        </div>

        <div className={table.scroll}>
          <table className={table.table}>
            <thead>
              <tr>
                <th className={table.th} scope="col">Client</th>
                <th className={table.th} scope="col">Main contact</th>
                <th className={table.th} scope="col">Portal</th>
                <th className={table.th} scope="col">Projects</th>
                <th className={`${table.th} ${table.numericHead}`} scope="col">Committed</th>
                <th className={table.th} scope="col">Added</th>
                <th className={`${table.th} ${table.actionsHead}`} scope="col">
                  <span className={table.muted}>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr>
                  <td className={table.emptyCell} colSpan={7}>
                    <p className={table.emptyTitle}>No clients yet.</p>
                    <p className={table.emptyHint}>
                      Add one by hand, or onboard an enquiry that has come in through the website.
                    </p>
                  </td>
                </tr>
              ) : (
                clients.map((client) => {
                  const primary = client.contacts[0];
                  const live = client.projects.filter(
                    (p) => !['closed', 'cancelled'].includes(p.status),
                  ).length;

                  /**
                   * Only lines already in the client's own currency are summed.
                   * Nothing here converts between currencies, so adding a TZS
                   * line to a USD total would print a number that is not money.
                   * Anything else is counted and named instead.
                   */
                  const lines = client.projects.flatMap((p) => p.lineItems);
                  const committed = lines
                    .filter((l) => l.currency === client.currency)
                    .reduce((total, l) => total + l.amountMinor * l.quantity, 0);
                  const otherCurrencies = [
                    ...new Set(
                      lines.filter((l) => l.currency !== client.currency).map((l) => l.currency),
                    ),
                  ];

                  return (
                    <tr key={client.id} className={table.tr}>
                      <td className={`${table.td} ${table.primary}`}>
                        <Link href={`/clients/${client.slug}`} className={table.link}>
                          {client.name}
                        </Link>
                        <span className={table.sub}>{client.country}</span>
                      </td>
                      <td className={table.td}>
                        {primary ? (
                          <>
                            {primary.name}
                            <span className={table.sub}>{primary.email}</span>
                          </>
                        ) : (
                          <span className={table.muted}>No contact</span>
                        )}
                      </td>
                      <td className={table.td}>
                        {!primary || !primary.canSignIn ? (
                          <span className={`${forms.badge} ${forms.badgeBad}`}>Off</span>
                        ) : primary.activatedAt ? (
                          <span className={`${forms.badge} ${forms.badgeGood}`}>Active</span>
                        ) : (
                          <span className={`${forms.badge} ${forms.badgeWarn}`}>Not set up</span>
                        )}
                      </td>
                      <td className={table.td}>
                        {client.projects.length === 0 ? (
                          <span className={table.muted}>None</span>
                        ) : (
                          <>
                            {client.projects.length}
                            {live > 0 && <span className={table.sub}>{live} live</span>}
                          </>
                        )}
                      </td>
                      <td className={`${table.td} ${table.numeric}`}>
                        {formatMoney(committed, client.currency)}
                        {otherCurrencies.length > 0 && (
                          <span className={table.sub}>
                            plus {otherCurrencies.join(', ')}
                          </span>
                        )}
                      </td>
                      <td className={`${table.td} ${table.nowrap}`}>
                        {formatShortDate(client.createdAt)}
                        <span className={table.sub}>{formatRelative(client.createdAt, now)}</span>
                      </td>
                      <td className={`${table.td} ${table.actions}`}>
                        <span className={table.actionGroup}>
                          <Link href={`/clients/${client.slug}`} className={table.action}>
                            Open
                          </Link>
                        </span>
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
