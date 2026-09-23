import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/console/auth';
import { formatShortDate } from '@/lib/console/money';
import { ArchiveWriter, WriterForm } from '../WriterForm';
import styles from '../../../Admin.module.css';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const writer = await db.writer.findUnique({
    where: { id },
    select: { name: true },
  });
  return { title: writer?.name ?? 'Writer' };
}

export default async function WriterPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('journal');
  const { id } = await params;

  const writer = await db.writer.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      name: true,
      role: true,
      bio: true,
      link: true,
      photo: true,
      email: true,
      phone: true,
      notes: true,
      posts: {
        where: { deletedAt: null },
        orderBy: { updatedAt: 'desc' },
        select: { id: true, title: true, status: true, publishedAt: true },
      },
    },
  });
  if (!writer) notFound();

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <Link href="/posts/writers" className={styles.backLink}>
            ← Writers
          </Link>
          <h1 className={styles.heading}>{writer.name}</h1>
          {writer.role && <p className={styles.lead}>{writer.role}</p>}
        </div>
      </div>

      <div className={styles.split}>
        <section className={`${forms.card} ${styles.splitMain}`}>
          <WriterForm
            writer={{
              id: writer.id,
              name: writer.name,
              role: writer.role ?? '',
              bio: writer.bio ?? '',
              link: writer.link ?? '',
              photo: writer.photo ?? '',
              email: writer.email ?? '',
              phone: writer.phone ?? '',
              notes: writer.notes ?? '',
            }}
          />
        </section>

        <aside className={styles.splitAside}>
          <div className={table.frame}>
            <div className={table.toolbar}>
              <div className={table.toolbarText}>
                <h2 className={table.title}>Their articles</h2>
                <span className={table.count}>{writer.posts.length}</span>
              </div>
            </div>
            <div className={table.scroll}>
              <table className={`${table.table} ${table.compact}`}>
                <thead>
                  <tr>
                    <th className={table.th} scope="col">
                      Article
                    </th>
                    <th className={table.th} scope="col">
                      State
                    </th>
                    <th className={table.th} scope="col">
                      Dated
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {writer.posts.length === 0 ? (
                    <tr>
                      <td className={table.emptyCell} colSpan={3}>
                        <p className={table.emptyTitle}>No articles yet.</p>
                        <p className={table.emptyHint}>Choose them as the byline on a post.</p>
                      </td>
                    </tr>
                  ) : (
                    writer.posts.map((post) => (
                      <tr key={post.id} className={table.tr}>
                        <td className={`${table.td} ${table.primary}`}>
                          <Link href={`/posts/${post.id}`} className={table.link}>
                            {post.title || 'Untitled draft'}
                          </Link>
                        </td>
                        <td className={table.td}>
                          <span
                            className={`${forms.badge} ${post.status === 'published' ? forms.badgeGood : ''}`}
                          >
                            {post.status === 'published' ? 'Published' : 'Draft'}
                          </span>
                        </td>
                        <td className={`${table.td} ${table.nowrap}`}>
                          {formatShortDate(post.publishedAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <section className={forms.card}>
            <div className={forms.cardHeader}>
              <h2 className={forms.cardTitle}>Remove</h2>
            </div>
            <ArchiveWriter writerId={writer.id} postCount={writer.posts.length} />
          </section>
        </aside>
      </div>
    </main>
  );
}
