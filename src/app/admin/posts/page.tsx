import Link from 'next/link';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/console/auth';
import { consoleEnv } from '@/lib/console/env';
import { formatShortDate } from '@/lib/console/money';
import { NewPostForm } from './PostForms';
import styles from '../Admin.module.css';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';

export const metadata = { title: 'Journal' };

export default async function PostsPage() {
  await requirePermission('journal');
  const now = new Date();

  const posts = await db.post.findMany({
    where: { deletedAt: null },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      status: true,
      tags: true,
      coverImage: true,
      publishedAt: true,
      updatedAt: true,
      bodyMarkdown: true,
      authorName: true,
    },
  });

  const live = posts.filter(
    (post) =>
      post.status === 'published' && post.publishedAt !== null && post.publishedAt <= now,
  ).length;
  const scheduled = posts.filter(
    (post) => post.status === 'published' && post.publishedAt !== null && post.publishedAt > now,
  ).length;
  const drafts = posts.filter((post) => post.status === 'draft').length;

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <h1 className={styles.heading}>
            The <span className={styles.headingAccent}>journal</span>
          </h1>
          <p className={styles.lead}>
            Written here and published straight to the site. A post dated in the future waits until
            then, even once published.
          </p>
        </div>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <p className={styles.statLabel}>Live</p>
          <p className={styles.statValue}>{live}</p>
          <p className={styles.statHint}>On the blog now</p>
        </div>
        <div className={styles.stat}>
          <p className={styles.statLabel}>Scheduled</p>
          <p className={styles.statValue}>{scheduled}</p>
          <p className={styles.statHint}>Published, dated ahead</p>
        </div>
        <div className={styles.stat}>
          <p className={styles.statLabel}>Drafts</p>
          <p className={styles.statValue}>{drafts}</p>
          <p className={styles.statHint}>Not on the site</p>
        </div>
      </div>

      <div className={styles.stack}>
        <section className={forms.card}>
          <div className={forms.cardHeader}>
            <h2 className={forms.cardTitle}>Start a post</h2>
          </div>
          <NewPostForm />
        </section>

        <div className={table.frame}>
          <div className={table.toolbar}>
            <div className={table.toolbarText}>
              <h2 className={table.title}>Everything written</h2>
              <span className={table.count}>
                {posts.length} {posts.length === 1 ? 'post' : 'posts'}
              </span>
            </div>
          </div>
          <div className={table.scroll}>
            <table className={table.table}>
              <thead>
                <tr>
                  <th className={table.th} scope="col">Post</th>
                  <th className={table.th} scope="col">State</th>
                  <th className={table.th} scope="col">Dated</th>
                  <th className={table.th} scope="col">Tags</th>
                  <th className={`${table.th} ${table.numericHead}`} scope="col">Words</th>
                  <th className={`${table.th} ${table.actionsHead}`} scope="col">
                    <span className={table.muted}>Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {posts.length === 0 ? (
                  <tr>
                    <td className={table.emptyCell} colSpan={6}>
                      <p className={table.emptyTitle}>Nothing written yet.</p>
                      <p className={table.emptyHint}>Start one above.</p>
                    </td>
                  </tr>
                ) : (
                  posts.map((post) => {
                    const pending =
                      post.status === 'published' &&
                      post.publishedAt !== null &&
                      post.publishedAt > now;
                    const words = post.bodyMarkdown.trim().split(/\s+/).filter(Boolean).length;

                    return (
                      <tr key={post.id} className={table.tr}>
                        <td className={`${table.td} ${table.primary}`}>
                          <Link href={`/posts/${post.slug}`} className={table.link}>
                            {post.title}
                          </Link>
                          <span className={table.sub}>
                            /blog/{post.slug}
                            {!post.coverImage && ' · standard cover'}
                          </span>
                        </td>
                        <td className={table.td}>
                          <span
                            className={`${forms.badge} ${
                              pending
                                ? forms.badgeWarn
                                : post.status === 'published'
                                  ? forms.badgeGood
                                  : ''
                            }`}
                          >
                            {pending ? 'Scheduled' : post.status === 'published' ? 'Live' : 'Draft'}
                          </span>
                        </td>
                        <td className={`${table.td} ${table.nowrap}`}>
                          {formatShortDate(post.publishedAt)}
                        </td>
                        <td className={table.td}>
                          {post.tags.length > 0 ? (
                            post.tags.join(', ')
                          ) : (
                            <span className={table.muted}>None</span>
                          )}
                        </td>
                        <td className={`${table.td} ${table.numeric}`}>{words}</td>
                        <td className={`${table.td} ${table.actions}`}>
                          <span className={table.actionGroup}>
                            <Link href={`/posts/${post.slug}`} className={table.action}>
                              Edit
                            </Link>
                            {post.status === 'published' && !pending && (
                              <a
                                href={`${consoleEnv.publicOrigin}/blog/${post.slug}`}
                                className={table.action}
                                target="_blank"
                                rel="noreferrer noopener"
                              >
                                View
                              </a>
                            )}
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
      </div>
    </main>
  );
}
