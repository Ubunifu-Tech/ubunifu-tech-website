import Link from 'next/link';
import { db } from '@/lib/db';
import type { Prisma } from '@/generated/prisma/client';
import { requirePermission } from '@/lib/console/auth';
import { consoleEnv } from '@/lib/console/env';
import { formatRelative, formatShortDate } from '@/lib/console/money';
import { Figures } from '@/components/console/Figures';
import { ListFooter, ListToolbar, searchText } from '@/components/console/ListToolbar';
import { EditorialVisual } from '@/components/EditorialVisual';
import { coverForSlug } from '@/content/blog-covers';
import { startPost } from './actions';
import styles from '../Admin.module.css';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';
import journal from './Journal.module.css';

export const metadata = { title: 'Journal' };

const VIEWS = [
  { key: 'all', label: 'All' },
  { key: 'live', label: 'Live' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'drafts', label: 'Drafts' },
] as const;

function viewToWhere(key: string, now: Date): Prisma.PostWhereInput {
  switch (key) {
    case 'live':
      return { status: 'published', publishedAt: { lte: now } };
    case 'scheduled':
      return { status: 'published', publishedAt: { gt: now } };
    case 'drafts':
      return { status: 'draft' };
    default:
      return {};
  }
}

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string; q?: string }>;
}) {
  await requirePermission('journal');
  const { show, q } = await searchParams;
  const active = VIEWS.some((view) => view.key === show) ? show! : 'all';
  const query = searchText(q);
  const now = new Date();

  const matching: Prisma.PostWhereInput = query
    ? {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { excerpt: { contains: query, mode: 'insensitive' } },
          { slug: { contains: query, mode: 'insensitive' } },
          { tags: { has: query } },
        ],
      }
    : {};

  const [posts, viewCounts, lastLive] = await Promise.all([
    db.post.findMany({
      where: { AND: [{ deletedAt: null }, viewToWhere(active, now), matching] },
      // Drafts being worked on first, then by date.
      orderBy: [{ updatedAt: 'desc' }],
      take: 300,
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        status: true,
        tags: true,
        coverImage: true,
        coverAlt: true,
        publishedAt: true,
        updatedAt: true,
        bodyMarkdown: true,
        authorName: true,
      },
    }),
    Promise.all(
      VIEWS.map((view) =>
        db.post.count({
          where: { AND: [{ deletedAt: null }, viewToWhere(view.key, now), matching] },
        }),
      ),
    ),
    db.post.findFirst({
      where: { deletedAt: null, status: 'published', publishedAt: { lte: now } },
      orderBy: { publishedAt: 'desc' },
      select: { publishedAt: true, title: true },
    }),
  ]);

  // The figures describe the whole journal, whichever view is open.
  const [liveCount, scheduledCount, draftCount] = await Promise.all([
    db.post.count({ where: { deletedAt: null, ...viewToWhere('live', now) } }),
    db.post.count({ where: { deletedAt: null, ...viewToWhere('scheduled', now) } }),
    db.post.count({ where: { deletedAt: null, ...viewToWhere('drafts', now) } }),
  ]);
  const total = viewCounts[VIEWS.findIndex((view) => view.key === active)] ?? 0;
  const daysSince = lastLive?.publishedAt
    ? Math.floor((now.getTime() - lastLive.publishedAt.getTime()) / 86_400_000)
    : null;

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <h1 className={styles.heading}>
            The <span className={styles.headingAccent}>journal</span>
          </h1>
          <p className={styles.lead}>Articles on the website, from first draft to published.</p>
        </div>
        <div className={styles.headActions}>
          <Link href="/posts/writers" className={`${forms.button} ${forms.quiet}`}>
            Writers
          </Link>
          <form action={startPost}>
            <button type="submit" className={forms.button}>
              New post
            </button>
          </form>
        </div>
      </div>

      <Figures
        items={[
          { label: 'Live', value: liveCount, note: 'On the blog now', href: '/posts?show=live' },
          {
            label: 'Scheduled',
            value: scheduledCount,
            note: scheduledCount === 0 ? 'Nothing waiting for its date' : 'Go live on their date',
            href: '/posts?show=scheduled',
          },
          {
            label: 'Drafts',
            value: draftCount,
            note: draftCount === 0 ? 'Nothing in progress' : 'Not on the site',
            href: '/posts?show=drafts',
          },
          {
            label: 'Last published',
            value: lastLive?.publishedAt ? formatShortDate(lastLive.publishedAt) : 'Never',
            note:
              daysSince === null
                ? 'Nothing is live yet'
                : daysSince === 0
                  ? 'Today'
                  : `${daysSince} ${daysSince === 1 ? 'day' : 'days'} ago`,
            tone: daysSince !== null && daysSince > 60 ? 'warn' : undefined,
          },
        ]}
      />

      <div className={table.frame}>
        <ListToolbar
          path="/posts"
          views={VIEWS.map((view, index) => ({ ...view, count: viewCounts[index] ?? 0 }))}
          current={active}
          defaultView="all"
          query={query}
          searchLabel="Search posts"
        />
        <div className={table.scroll}>
          <table className={table.table}>
            <thead>
              <tr>
                <th className={table.th} scope="col">Post</th>
                <th className={table.th} scope="col">State</th>
                <th className={table.th} scope="col">Dated</th>
                <th className={table.th} scope="col">Tags</th>
                <th className={`${table.th} ${table.numericHead}`} scope="col">Length</th>
                <th className={table.th} scope="col">Edited</th>
                <th className={`${table.th} ${table.actionsHead}`} scope="col">
                  <span className={table.muted}>On the site</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {posts.length === 0 ? (
                <tr>
                  <td className={table.emptyCell} colSpan={7}>
                    <p className={table.emptyTitle}>
                      {query
                        ? `No posts match “${query}” here.`
                        : active === 'all'
                          ? 'Nothing written yet.'
                          : 'Nothing in this view.'}
                    </p>
                    <p className={table.emptyHint}>
                      {query ? 'Try another view, or search for something else.' : 'New post starts one.'}
                    </p>
                  </td>
                </tr>
              ) : (
                posts.map((post) => {
                  const scheduled =
                    post.status === 'published' &&
                    post.publishedAt !== null &&
                    post.publishedAt > now;
                  const live = post.status === 'published' && !scheduled;
                  const words = post.bodyMarkdown.trim().split(/\s+/).filter(Boolean).length;
                  const cover = post.coverImage
                    ? { image: post.coverImage, alt: post.coverAlt ?? '' }
                    : coverForSlug(post.slug);

                  return (
                    <tr key={post.id} className={table.tr}>
                      <td className={`${table.td} ${table.primary}`}>
                        <span className={journal.post}>
                          <span className={journal.thumb}>
                            <EditorialVisual src={cover.image} alt="" fill sizes="5rem" className={journal.thumbImage} />
                          </span>
                          <span className={table.whoText}>
                            <Link href={`/posts/${post.id}`} className={table.link}>
                              {post.title || 'Untitled draft'}
                            </Link>
                            <span className={`${table.sub} ${journal.summary}`}>
                              {post.excerpt || 'No summary yet'}
                            </span>
                          </span>
                        </span>
                      </td>
                      <td className={table.td}>
                        <span
                          className={`${forms.badge} ${
                            scheduled ? forms.badgeWarn : live ? forms.badgeGood : ''
                          }`}
                        >
                          {scheduled ? 'Scheduled' : live ? 'Live' : 'Draft'}
                        </span>
                      </td>
                      <td className={`${table.td} ${table.nowrap}`}>
                        {post.publishedAt ? formatShortDate(post.publishedAt) : <span className={table.muted}>Not set</span>}
                      </td>
                      <td className={table.td}>
                        {post.tags.length > 0 ? (
                          post.tags.join(', ')
                        ) : (
                          <span className={table.muted}>None</span>
                        )}
                      </td>
                      <td className={`${table.td} ${table.numeric}`}>
                        {words.toLocaleString('en-GB')}
                        <span className={table.sub}>{Math.max(1, Math.round(words / 200))} min read</span>
                      </td>
                      <td className={`${table.td} ${table.nowrap}`}>
                        {formatRelative(post.updatedAt, now)}
                      </td>
                      <td className={`${table.td} ${table.actions}`}>
                        {live ? (
                          <a
                            href={`${consoleEnv.publicOrigin}/blog/${post.slug}`}
                            className={table.action}
                            target="_blank"
                            rel="noreferrer noopener"
                          >
                            View
                          </a>
                        ) : (
                          <span className={table.muted}>Not yet</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <ListFooter shown={posts.length} total={total} noun={['post', 'posts']} query={query} />
      </div>
    </main>
  );
}
