import 'server-only';
import { db } from '@/lib/db';
import {
  defaultBlogCover,
  readPostFile,
  readPostFiles,
  resolveBlogCover,
  type BlogPost,
  type BlogPostMeta,
} from './blog-files';

/**
 * The blog, read from the database.
 *
 * Posts used to be markdown files committed to the repository, which meant
 * publishing anything needed a deploy. They now live in the Post table and are
 * written in the console — but the shape returned here is exactly what the
 * files produced, so every page that renders a post is unchanged.
 *
 * THE FILES ARE STILL THE FALLBACK, and the rule for choosing is the same one
 * scripts/migrate-deploy.mjs uses for migrations:
 *
 *   No DATABASE_URL at all  → read the files. This is a preview build with no
 *                             database attached, and failing it would block
 *                             every preview of a marketing change.
 *   DATABASE_URL set        → read the database, and let a failure fail. That
 *                             is production, and quietly serving a stale copy
 *                             of the blog is worse than a build that stops.
 *
 * Anything else — falling back on an error in production — would mean a
 * database blip silently republishes whatever the files last said, which could
 * be a post that was taken down.
 */

export { defaultBlogCover, resolveBlogCover };
export type { BlogPost, BlogPostMeta };

function usingFiles(): boolean {
  return !process.env.DATABASE_URL;
}

/** Same estimate the file reader used, so reading times do not shift. */
function estimateReadingTime(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

type PostRow = {
  slug: string;
  title: string;
  excerpt: string;
  bodyMarkdown: string;
  tags: string[];
  coverImage: string | null;
  coverAlt: string | null;
  authorName: string | null;
  publishedAt: Date | null;
  createdAt: Date;
};

function toBlogPost(row: PostRow): BlogPost {
  const published = row.publishedAt ?? row.createdAt;
  return {
    slug: row.slug,
    title: row.title,
    // The files carried a plain calendar date and every page formats it from
    // that, so the same shape comes back rather than a timestamp.
    date: published.toISOString().slice(0, 10),
    author: row.authorName ?? 'Ubunifu Technologies',
    excerpt: row.excerpt,
    tags: row.tags,
    coverImage: row.coverImage ?? undefined,
    coverAlt: row.coverAlt ?? undefined,
    content: row.bodyMarkdown,
    readingTime: estimateReadingTime(row.bodyMarkdown),
  };
}

const SELECT = {
  slug: true,
  title: true,
  excerpt: true,
  bodyMarkdown: true,
  tags: true,
  coverImage: true,
  coverAlt: true,
  authorName: true,
  publishedAt: true,
  createdAt: true,
} as const;

/** Newest first, then by slug, which is how the files were ordered. */
function comparePosts(a: BlogPost, b: BlogPost): number {
  const byDate = b.date.localeCompare(a.date);
  if (byDate !== 0) return byDate;
  if (a.slug === b.slug) return 0;
  return a.slug < b.slug ? -1 : 1;
}

export async function getAllPosts(): Promise<BlogPost[]> {
  if (usingFiles()) return readPostFiles();

  const rows = await db.post.findMany({
    where: {
      status: 'published',
      deletedAt: null,
      // A post dated in the future is scheduled, not live.
      publishedAt: { lte: new Date() },
    },
    orderBy: [{ publishedAt: 'desc' }, { slug: 'asc' }],
    select: SELECT,
  });

  return rows.map(toBlogPost).sort(comparePosts);
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  if (usingFiles()) return readPostFile(slug);

  const row = await db.post.findFirst({
    where: {
      slug,
      status: 'published',
      deletedAt: null,
      publishedAt: { lte: new Date() },
    },
    select: SELECT,
  });

  return row ? toBlogPost(row) : null;
}
