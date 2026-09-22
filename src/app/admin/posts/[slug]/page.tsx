import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/console/auth';
import { activityFor } from '@/lib/console/activity';
import { renderMarkdown } from '@/lib/console/markdown';
import { formatShortDate, toDateInputValue } from '@/lib/console/money';
import { ActivityFeed } from '@/components/console/ActivityFeed';
import { ArchiveControl, PostEditor, PublishControls, type PostDraft } from '../PostForms';
import styles from '../../Admin.module.css';
import forms from '@/styles/forms.module.css';
import { Callout } from '@/components/console/Callout';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await db.post.findUnique({ where: { slug }, select: { title: true } });
  return { title: post?.title ?? 'Post' };
}

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requirePermission('journal');
  const { slug } = await params;
  const now = new Date();

  const post = await db.post.findFirst({
    where: { slug, deletedAt: null },
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
      createdAt: true,
      updatedAt: true,
      author: { select: { name: true } },
    },
  });

  if (!post) notFound();

  const activity = await activityFor([post.id]);
  const scheduled =
    post.status === 'published' && post.publishedAt !== null && post.publishedAt > now;
  const live = post.status === 'published' && !scheduled;

  const draft: PostDraft = {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    body: post.bodyMarkdown,
    tags: post.tags,
    coverImage: post.coverImage ?? '',
    coverAlt: post.coverAlt ?? '',
    publishedAt: toDateInputValue(post.publishedAt),
    published: post.status === 'published',
  };

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <Link href="/posts" className={styles.backLink}>
            ← Journal
          </Link>
          <h1 className={styles.heading}>{post.title}</h1>
          <p className={styles.facts}>
            <span>
              <span className={styles.factLabel}>Address</span> /blog/{post.slug}
            </span>
            <span>
              <span className={styles.factLabel}>Byline</span>{' '}
              {post.authorName ?? 'Ubunifu Technologies'}
            </span>
            <span>
              <span className={styles.factLabel}>Dated</span>{' '}
              {formatShortDate(post.publishedAt)}
            </span>
            {post.author && (
              <span>
                <span className={styles.factLabel}>Written by</span> {post.author.name}
              </span>
            )}
          </p>
        </div>
        <span
          className={`${forms.badge} ${
            scheduled ? forms.badgeWarn : live ? forms.badgeGood : ''
          }`}
        >
          {scheduled ? 'Scheduled' : live ? 'Live' : 'Draft'}
        </span>
      </div>

      {scheduled && (
        <Callout kind="info">
          Scheduled for {formatShortDate(post.publishedAt)}. It will appear on the site then.
        </Callout>
      )}

      <div className={styles.columns}>
        <PostEditor post={draft} />

        <div className={styles.stack}>
          <section className={forms.card}>
            <div className={forms.cardHeader}>
              <h2 className={forms.cardTitle}>{live ? 'It is live' : 'Publishing'}</h2>
            </div>
            <PublishControls postId={post.id} published={post.status === 'published'} />
            <ArchiveControl postId={post.id} published={post.status === 'published'} />
          </section>

          <section className={forms.card}>
            <div className={forms.cardHeader}>
              <h2 className={forms.cardTitle}>How it reads</h2>
              <span className={forms.cardMeta}>Saved version, as a reader sees it</span>
            </div>
            {post.bodyMarkdown.trim() ? (
              <div
                className={forms.prose}
                // The renderer escapes everything first and reintroduces only
                // the shapes it knows. Nothing here can become a script tag.
                dangerouslySetInnerHTML={{ __html: renderMarkdown(post.bodyMarkdown) }}
              />
            ) : (
              <p className={styles.note}>Nothing written yet.</p>
            )}
          </section>

          <section className={forms.card}>
            <div className={forms.cardHeader}>
              <h2 className={forms.cardTitle}>What has happened</h2>
            </div>
            <ActivityFeed items={activity} now={now} />
          </section>
        </div>
      </div>
    </main>
  );
}
