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
 * NOTHING HERE THROWS. The marketing site is the front door, and a database
 * that is down or mid-migration must never take it with it — a visitor reading
 * about our services should not meet a stack trace because the journal cannot
 * be reached. Every read returns whether it succeeded, and the pages decide
 * what to show; see src/app/(site)/blog/page.tsx for what a reader gets.
 *
 * What a failure must NOT do is quietly serve the markdown files instead. The
 * files are a frozen copy from the day the CMS landed, so falling back to them
 * on an error would republish whatever they last said — including a post that
 * was deliberately taken down. An honest "we cannot load this right now" is
 * recoverable; silently resurrecting withdrawn writing is not.
 *
 * So there are three states, not two:
 *
 *   No DATABASE_URL at all  → read the files. A preview build with no database
 *                             attached, where failing would block every preview
 *                             of a marketing change.
 *   Database answers        → use it.
 *   Database errors         → say so. Never the files.
 */

export { defaultBlogCover, resolveBlogCover };
export type { BlogCover } from '@/content/blog-covers';
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

/**
 * `unavailable` is the whole point of these shapes.
 *
 * Without it a page cannot tell "there are no articles" from "we could not
 * ask", and those need opposite responses: an empty journal is a fine thing to
 * say, while a missing article must NOT be reported as a 404 — that tells a
 * reader something untrue and lets it be cached.
 */
export type PostsResult = { posts: BlogPost[]; unavailable: boolean };
export type PostResult = { post: BlogPost | null; unavailable: boolean };

function unreachable(scope: string, error: unknown): void {
  // Logged, not swallowed. The reader sees a sentence; we see the cause.
  console.error(`[blog] could not read ${scope} from the database`, error);
}

export async function readPosts(): Promise<PostsResult> {
  if (usingFiles()) return { posts: readPostFiles(), unavailable: false };

  try {
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

    return { posts: rows.map(toBlogPost).sort(comparePosts), unavailable: false };
  } catch (error) {
    unreachable('the journal', error);
    return { posts: [], unavailable: true };
  }
}

export async function readPost(slug: string): Promise<PostResult> {
  if (usingFiles()) return { post: readPostFile(slug), unavailable: false };

  try {
    const row = await db.post.findFirst({
      where: {
        slug,
        status: 'published',
        deletedAt: null,
        publishedAt: { lte: new Date() },
      },
      select: SELECT,
    });

    return { post: row ? toBlogPost(row) : null, unavailable: false };
  } catch (error) {
    unreachable(`the post "${slug}"`, error);
    return { post: null, unavailable: true };
  }
}

/**
 * Throws on purpose, and is only for the parity check.
 *
 * scripts/check-blog-parity.mts asserts the database and the files still agree,
 * and a check that quietly passes on an empty result because the database was
 * unreachable is a check that does nothing.
 */
export async function getAllPostsOrThrow(): Promise<BlogPost[]> {
  if (usingFiles()) return readPostFiles();

  const rows = await db.post.findMany({
    where: { status: 'published', deletedAt: null, publishedAt: { lte: new Date() } },
    orderBy: [{ publishedAt: 'desc' }, { slug: 'asc' }],
    select: SELECT,
  });

  return rows.map(toBlogPost).sort(comparePosts);
}
