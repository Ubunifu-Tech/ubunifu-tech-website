import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireStaff } from '@/lib/console/auth';
import { searchText } from '@/components/console/ListToolbar';
import { exactRecord, searchConsole } from '@/lib/console/search';
import styles from '../Admin.module.css';
import table from '@/styles/table.module.css';

export const metadata = { title: 'Search' };

/**
 * What the search box in the top band finds. An exact number or reference
 * opens its record straight away; anything else lists a few of each kind.
 */
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const staff = await requireStaff();
  const query = searchText((await searchParams).q);

  if (query) {
    const exact = await exactRecord(staff, query);
    if (exact) redirect(exact);
  }
  const hits = query ? await searchConsole(staff, query) : [];

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <h1 className={styles.heading}>{query ? `Search: ${query}` : 'Search'}</h1>
        </div>
      </div>

      <div className={table.frame}>
        <div className={table.scroll}>
          <table className={table.table}>
            <thead>
              <tr>
                <th className={table.th} scope="col">
                  Type
                </th>
                <th className={table.th} scope="col">
                  Name
                </th>
                <th className={table.th} scope="col">
                  Client
                </th>
                <th className={table.th} scope="col">
                  Number
                </th>
              </tr>
            </thead>
            <tbody>
              {hits.length === 0 ? (
                <tr>
                  <td className={table.emptyCell} colSpan={4}>
                    <p className={table.emptyTitle}>
                      {query ? `Nothing matches “${query}”.` : 'Type a name, an email, a number or a reference.'}
                    </p>
                  </td>
                </tr>
              ) : (
                hits.map((hit) => (
                  <tr key={`${hit.type}:${hit.href}:${hit.name}`} className={table.tr}>
                    <td className={`${table.td} ${table.nowrap}`}>{hit.type}</td>
                    <td className={`${table.td} ${table.name}`}>
                      <Link href={hit.href} className={table.link}>
                        {hit.name}
                      </Link>
                    </td>
                    <td className={`${table.td} ${table.name}`}>
                      {hit.client ? (
                        <Link href={hit.client.href} className={table.link}>
                          {hit.client.name}
                        </Link>
                      ) : (
                        <span className={table.muted}>None</span>
                      )}
                    </td>
                    <td className={`${table.td} ${table.nowrap}`}>
                      {hit.reference ?? <span className={table.muted}>None</span>}
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
