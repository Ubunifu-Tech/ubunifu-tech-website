import Link from 'next/link';
import { db } from '@/lib/db';
import type { Prisma } from '@/generated/prisma/client';
import { requireStaff } from '@/lib/console/auth';
import { formatMoney, formatRelative, formatShortDate } from '@/lib/console/money';
import { Avatar } from '@/components/console/Avatar';
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
  await requireStaff();
  const { show, q } = await searchParams;
  const active = VIEWS.some((view) => view.key === show) ? show! : 'all';
  const query = searchText(q);
  const now = new Date();

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
        <Link href="/clients/new" className={forms.button}>
          Add a client
        </Link>
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
                <th className={table.th} scope="col">Main contact</th>
                <th className={table.th} scope="col">Portal</th>
                <th className={table.th} scope="col">Projects</th>
                <th className={`${table.th} ${table.numericHead}`} scope="col">Committed</th>
                <th className={table.th} scope="col">Added</th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr>
                  <td className={table.emptyCell} colSpan={6}>
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
                        <span className={table.who}>
                          <Avatar name={client.name} size="sm" />
                          <span className={table.whoText}>
                            <Link href={`/clients/${client.slug}`} className={table.link}>
                              {client.name}
                            </Link>
                            <span className={table.sub}>{client.country}</span>
                          </span>
                        </span>
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
                          <span className={forms.badge}>Off</span>
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
                            {live > 0 && <span className={table.sub}>{live} open</span>}
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
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <ListFooter shown={clients.length} total={total} noun={['client', 'clients']} query={query} />
      </div>
    </main>
  );
}
