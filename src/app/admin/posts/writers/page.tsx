import Link from 'next/link';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/console/auth';
import { Avatar } from '@/components/console/Avatar';
import { ListFooter } from '@/components/console/ListToolbar';
import { WriterForm } from './WriterForm';
import styles from '../../Admin.module.css';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';
import writers from './Writers.module.css';

export const metadata = { title: 'Writers' };

/**
 * Everyone who writes for the journal and how to reach them. A writer is not
 * a console account: a guest or a client can have a byline without signing
 * in to anything.
 */
export default async function WritersPage() {
  await requirePermission('journal');

  const list = await db.writer.findMany({
    where: { deletedAt: null },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      role: true,
      email: true,
      phone: true,
      photo: true,
      link: true,
      bio: true,
      posts: { where: { deletedAt: null }, select: { status: true } },
    },
  });

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <Link href="/posts" className={styles.backLink}>
            ← Journal
          </Link>
          <h1 className={styles.heading}>Writers</h1>
          <p className={styles.lead}>
            Everyone who writes for the journal. Their role, bio and photo show with their articles;
            contact details stay here.
          </p>
        </div>
      </div>

      <div className={styles.stack}>
        <div className={table.frame}>
          <div className={table.toolbar}>
            <div className={table.toolbarText}>
              <h2 className={table.title}>On the list</h2>
              <span className={table.count}>{list.length}</span>
            </div>
          </div>
          <div className={table.scroll}>
            <table className={`${table.table} ${table.compact}`}>
              <thead>
                <tr>
                  <th className={table.th} scope="col">
                    Writer
                  </th>
                  <th className={table.th} scope="col">
                    Contact
                  </th>
                  <th className={`${table.th} ${table.numericHead}`} scope="col">
                    Articles
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.length === 0 ? (
                  <tr>
                    <td className={table.emptyCell} colSpan={3}>
                      <p className={table.emptyTitle}>Nobody yet.</p>
                      <p className={table.emptyHint}>
                        Add a writer here, or from a post&rsquo;s byline. Articles by the company
                        need no one.
                      </p>
                    </td>
                  </tr>
                ) : (
                  list.map((writer) => {
                    const live = writer.posts.filter((post) => post.status === 'published').length;
                    const missing = [
                      !writer.role && 'role',
                      !writer.bio && 'bio',
                      !writer.photo && 'photo',
                    ].filter((item): item is string => Boolean(item));
                    return (
                      <tr key={writer.id} className={table.tr}>
                        <td className={`${table.td} ${table.primary}`}>
                          <span className={table.who}>
                            {writer.photo ? (
                              // eslint-disable-next-line @next/next/no-img-element -- a small console thumbnail of an uploaded photo.
                              <img src={writer.photo} alt="" className={writers.thumb} />
                            ) : (
                              <Avatar name={writer.name} size="sm" />
                            )}
                            <span className={table.whoText}>
                              <Link href={`/posts/writers/${writer.id}`} className={table.link}>
                                {writer.name}
                              </Link>
                              <span className={table.sub}>
                                {[writer.role, missing.length > 0 && `No ${listOf(missing)} yet`]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </span>
                            </span>
                          </span>
                        </td>
                        <td className={table.td}>
                          {writer.email ? (
                            <a href={`mailto:${writer.email}`}>{writer.email}</a>
                          ) : (
                            <span className={table.muted}>No email</span>
                          )}
                          {writer.phone && <span className={table.sub}>{writer.phone}</span>}
                        </td>
                        <td className={`${table.td} ${table.numeric}`}>
                          {writer.posts.length}
                          {writer.posts.length > 0 && (
                            <span className={table.sub}>{live} live</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <ListFooter shown={list.length} total={list.length} noun={['writer', 'writers']} />
        </div>

        <section className={forms.card}>
          <div className={forms.cardHeader}>
            <h2 className={forms.cardTitle}>Add a writer</h2>
          </div>
          <WriterForm />
        </section>
      </div>
    </main>
  );
}

/** "role", "role or bio", "role, bio or photo". */
function listOf(items: string[]): string {
  return items.length <= 1
    ? (items[0] ?? '')
    : `${items.slice(0, -1).join(', ')} or ${items[items.length - 1]}`;
}
