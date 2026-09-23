import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/console/auth';
import { activityFor } from '@/lib/console/activity';
import { toDateInputValue } from '@/lib/console/money';
import { ActivityFeed } from '@/components/console/ActivityFeed';
import { PostStudio } from '../PostStudio';
import styles from '../../Admin.module.css';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await db.post.findFirst({
    where: { OR: [{ id: slug }, { slug }] },
    select: { title: true },
  });
  return { title: post?.title || 'New post' };
}

const COMPANY = 'Ubunifu Technologies';

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requirePermission('journal');
  const { slug } = await params;
  const now = new Date();

  // Edited by its id, which never changes, so the address can follow the
  // title while it is a draft without moving the editor. An address still
  // works, for links made before.
  const post = await db.post.findFirst({
    where: { deletedAt: null, OR: [{ id: slug }, { slug }] },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      bodyMarkdown: true,
      status: true,
      tags: true,
      coverImage: true,
      coverAlt: true,
      authorName: true,
      publishedAt: true,
      firstPublishedAt: true,
      updatedAt: true,
    },
  });

  if (!post) notFound();

  const [activity, team, tagged] = await Promise.all([
    activityFor([post.id]),
    db.staffUser.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { name: true },
    }),
    // Every tag the journal already uses, most used first, so a new post
    // picks up the existing spelling instead of starting a near-duplicate.
    db.post.findMany({ where: { deletedAt: null }, select: { tags: true } }),
  ]);

  const usage = new Map<string, number>();
  for (const row of tagged) {
    for (const tag of row.tags) usage.set(tag, (usage.get(tag) ?? 0) + 1);
  }
  const tagSuggestions = [...usage]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag]) => tag);

  return (
    <main className={`${styles.page} ${styles.pageWide}`}>
      <PostStudio
        post={{
          id: post.id,
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt,
          body: post.bodyMarkdown,
          tags: post.tags,
          coverImage: post.coverImage ?? '',
          coverAlt: post.coverAlt ?? '',
          authorName: post.authorName ?? COMPANY,
          publishedAt: toDateInputValue(post.publishedAt),
          status: post.status === 'published' ? 'published' : 'draft',
          everPublished: post.firstPublishedAt !== null,
          version: post.updatedAt.toISOString(),
        }}
        bylines={[COMPANY, ...team.map((member) => member.name)]}
        tagSuggestions={tagSuggestions}
        history={<ActivityFeed items={activity} now={now} />}
      />
    </main>
  );
}
