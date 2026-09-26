import Link from 'next/link';
import { db } from '@/lib/db';
import type { Prisma } from '@/generated/prisma/client';
import { can, requireStaff } from '@/lib/console/auth';
import { formatMoney, formatShortDate } from '@/lib/console/money';
import { ListFooter, ListToolbar, searchText } from '@/components/console/ListToolbar';
import styles from '../Admin.module.css';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';

export const metadata = { title: 'Clients' };

const VIEWS = [
  { key: 'all', label: 'All' },
  { key: 'live', label: 'With open projects' },
  { key: 'portal', label: 'Portal not set up' },
  { key: 'idle', label: 'No projects' },
] as const;

function viewToWhere(key: string): Prisma.ClientWhereInput {
  switch (key) {
    case 'live':
      return {
        projects: { some: { deletedAt: null, status: { notIn: ['closed', 'cancelled'] } } },
      };
    case 'portal':
      return {
        contacts: {
          some: { deletedAt: null, isPrimary: true, canSignIn: true, activatedAt: null },
        },
      };
    case 'idle':
      return { projects: { none: { deletedAt: null } } };
    default:
      return {};
  }
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string; q?: string }>;
}) {
  const staff = await requireStaff();
  // What a client is worth is the fees on their projects: shown to those who see fees.
  const seesValue = can(staff, 'fees') || can(staff, 'invoices');
  const { show, q } = await searchParams;
  const active = VIEWS.some((view) => view.key === show) ? show! : 'all';
  const query = searchText(q);

  const matching: Prisma.ClientWhereInput = query
    ? {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { legalName: { contains: query, mode: 'insensitive' } },
          {
            contacts: {
              some: {
                deletedAt: null,
                OR: [
                  { name: { contains: query, mode: 'insensitive' } },
                  { email: { contains: query, mode: 'insensitive' } },
                ],
              },
            },
          },
        ],
      }
    : {};

  const viewCounts = await Promise.all(
    VIEWS.map((view) =>
      db.client.count({ where: { AND: [{ deletedAt: null }, viewToWhere(view.key), matching] } }),
    ),
  );
  const total = viewCounts[VIEWS.findIndex((view) => view.key === active)] ?? 0;
  const removedCount = can(staff, 'clients')
    ? await db.client.count({ where: { deletedAt: { not: null } } })
    : 0;

  const clients = await db.client.findMany({
    where: { AND: [{ deletedAt: null }, viewToWhere(active), matching] },
    take: 300,
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
            Everyone we work for.
          </p>
        </div>
        {can(staff, 'clients') && (
          <Link href="/clients/new" className={forms.button}>
            Add a client
          </Link>
        )}
      </div>

      <div className={table.frame}>
        <ListToolbar
          path="/clients"
          views={VIEWS.map((view, index) => ({ ...view, count: viewCounts[index] ?? 0 }))}
          current={active}
          defaultView="all"
          query={query}
          searchLabel="Search clients or contacts"
        />

        <div className={table.scroll}>
          <table className={table.table}>
            <thead>
              <tr>
                <th className={table.th} scope="col">Client</th>
                <th className={table.th} scope="col">Country</th>
                <th className={table.th} scope="col">Main contact</th>
                <th className={table.th} scope="col">Email</th>
                <th className={table.th} scope="col">Portal</th>
                <th className={`${table.th} ${table.numericHead}`} scope="col">Open projects</th>
                {seesValue && (
                  <th className={`${table.th} ${table.numericHead}`} scope="col">Committed</th>
                )}
                <th className={table.th} scope="col">Added</th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr>
                  <td className={table.emptyCell} colSpan={seesValue ? 8 : 7}>
                    <p className={table.emptyTitle}>
                      {query
                        ? `No clients match “${query}” here.`
                        : active === 'all'
                          ? 'No clients yet.'
                          : 'Nobody in this view.'}
                    </p>
                    <p className={table.emptyHint}>
                      {query
                        ? 'Try another view, or search for something else.'
                        : active === 'all'
                          ? 'Add one by hand, or onboard an enquiry that has come in through the website.'
                          : 'Try another view.'}
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
                      </td>
                      <td className={`${table.td} ${table.nowrap}`}>{client.country}</td>
                      <td className={table.td}>
                        {primary ? primary.name : <span className={table.muted}>No contact</span>}
                      </td>
                      <td className={table.td}>
                        {primary?.email ?? <span className={table.muted}>None yet</span>}
                      </td>
                      <td className={table.td}>
                        {!primary || !primary.canSignIn ? (
                          <span className={forms.badge}>Off</span>
                        ) : primary.activatedAt ? (
                          <span className={`${forms.badge} ${forms.badgeGood}`}>Active</span>
                        ) : (
                          <span className={`${forms.badge} ${forms.badgeWarn}`}>Not set up</span>
                        )}
                      </td>
                      <td className={`${table.td} ${table.numeric}`}>
                        {live > 0 ? live : <span className={table.muted}>None</span>}
                      </td>
                      {seesValue && (
                        <td
                          className={`${table.td} ${table.numeric}`}
                          title={
                            otherCurrencies.length > 0
                              ? `Also has fees in ${otherCurrencies.join(', ')}, not added in`
                              : undefined
                          }
                        >
                          {formatMoney(committed, client.currency)}
                        </td>
                      )}
                      <td className={`${table.td} ${table.nowrap}`}>
                        {formatShortDate(client.createdAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <ListFooter shown={clients.length} total={total} noun={['client', 'clients']} query={query} />
      </div>
      {removedCount > 0 && (
        <p className={styles.note}>
          <Link href="/removed" className={styles.inlineLink}>
            {removedCount} removed {removedCount === 1 ? 'client' : 'clients'}
          </Link>
          , with their records.
        </p>
      )}
    </main>
  );
}
