import 'server-only';

/**
 * The markdown files in _posts/.
 *
 * These were the blog until the CMS existed. They are now a fallback: the
 * database is the source of truth wherever there is one, and these are read
 * only when a build has no database attached at all — a preview deployment,
 * say. See src/lib/blog.ts, which decides between them.
 *
 * The parsing and the frontmatter rules are unchanged, so a post read from a
 * file is identical to what the site served before the switch.
 */

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { blogCovers, coverForSlug, type BlogCover } from '@/content/blog-covers';

const postsDirectory = path.join(process.cwd(), '_posts');
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const calendarDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const coverImagePattern = /^\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.(?:avif|jpe?g|png|webp)$/i;

/**
 * Kept for anything that needs "a cover" with no post in hand. A post itself
 * never reaches for this — see resolveBlogCover, which gives each slug its own.
 */
export const defaultBlogCover = blogCovers[3]!;

export interface BlogPostMeta {
  slug: string;
  title: string;
  date: string;
  author: string;
  excerpt: string;
  tags: string[];
  readingTime: number;
  coverImage?: string;
  coverAlt?: string;
}

export interface BlogPost extends BlogPostMeta {
  content: string;
}

type Frontmatter = Record<string, unknown>;

function frontmatterError(fileName: string, message: string): never {
  throw new Error(`[blog] ${fileName}: ${message}`);
}

function requiredString(
  data: Frontmatter,
  field: 'title' | 'date' | 'author' | 'excerpt',
  fileName: string,
): string {
  const value = data[field];

  if (typeof value !== 'string' || value.trim().length === 0) {
    return frontmatterError(fileName, `frontmatter field "${field}" must be a non-empty string`);
  }

  return value.trim();
}

function optionalString(data: Frontmatter, field: 'coverImage' | 'coverAlt', fileName: string) {
  const value = data[field];

  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'string' || value.trim().length === 0) {
    return frontmatterError(fileName, `frontmatter field "${field}" must be a non-empty string when provided`);
  }

  return value.trim();
}

function validateDate(date: string, fileName: string): string {
  if (!calendarDatePattern.test(date)) {
    return frontmatterError(fileName, 'frontmatter field "date" must use the YYYY-MM-DD format');
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    return frontmatterError(fileName, `frontmatter field "date" is not a valid calendar date: ${date}`);
  }

  return date;
}

function validateTags(value: unknown, fileName: string): string[] {
  if (!Array.isArray(value)) {
    return frontmatterError(fileName, 'frontmatter field "tags" must be an array of strings');
  }

  const tags = value.map((tag) => {
    if (typeof tag !== 'string' || tag.trim().length === 0) {
      return frontmatterError(fileName, 'frontmatter field "tags" may only contain non-empty strings');
    }

    return tag.trim();
  });

  if (new Set(tags).size !== tags.length) {
    return frontmatterError(fileName, 'frontmatter field "tags" may not contain duplicates');
  }

  return tags;
}

function validateCover(data: Frontmatter, fileName: string) {
  const coverImage = optionalString(data, 'coverImage', fileName);
  const coverAlt = optionalString(data, 'coverAlt', fileName);

  if ((coverImage && !coverAlt) || (!coverImage && coverAlt)) {
    return frontmatterError(
      fileName,
      'frontmatter fields "coverImage" and "coverAlt" must be provided together',
    );
  }

  if (coverImage && !coverImagePattern.test(coverImage)) {
    return frontmatterError(
      fileName,
      'frontmatter field "coverImage" must be a safe site-relative AVIF, JPEG, PNG, or WebP path',
    );
  }

  return { coverImage, coverAlt };
}

/**
 * A post's cover: the one it was given, or the one its address earns it.
 *
 * Writing a post in the console no longer means finding an image first. A post
 * with no cover gets one of the six standing compositions, chosen from the
 * slug, so it is distinct from its neighbours and identical on every render.
 *
 * coverImage and coverAlt are validated as a pair on the way in, so a post
 * either has both or neither; the ?? on each is belt and braces rather than a
 * real third case.
 */
export function resolveBlogCover(
  post: Pick<BlogPostMeta, 'slug' | 'coverImage' | 'coverAlt'>,
): BlogCover {
  const fallback = coverForSlug(post.slug);
  return {
    image: post.coverImage ?? fallback.image,
    alt: post.coverAlt ?? fallback.alt,
  };
}

// Rough reading time at ~200 words/minute, floored at 1 minute.
function estimateReadingTime(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function parsePost(fileName: string): BlogPost {
  const slug = fileName.replace(/\.md$/, '');
  if (!slugPattern.test(slug)) {
    return frontmatterError(fileName, 'filename must be a lowercase, hyphen-separated slug');
  }

  const fullPath = path.join(postsDirectory, fileName);
  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const parsed = matter(fileContents);
  const data = parsed.data as Frontmatter;
  const title = requiredString(data, 'title', fileName);
  const date = validateDate(requiredString(data, 'date', fileName), fileName);
  const author = requiredString(data, 'author', fileName);
  const excerpt = requiredString(data, 'excerpt', fileName);
  const tags = validateTags(data.tags, fileName);
  const { coverImage, coverAlt } = validateCover(data, fileName);

  return {
    slug,
    title,
    date,
    author,
    excerpt,
    tags,
    coverImage,
    coverAlt,
    content: parsed.content,
    readingTime: estimateReadingTime(parsed.content),
  };
}

function comparePosts(a: BlogPost, b: BlogPost): number {
  const byDate = b.date.localeCompare(a.date);
  if (byDate !== 0) {
    return byDate;
  }

  if (a.slug === b.slug) {
    return 0;
  }

  return a.slug < b.slug ? -1 : 1;
}

export function readPostFiles(): BlogPost[] {
  if (!fs.existsSync(postsDirectory)) {
    return [];
  }

  return fs
    .readdirSync(postsDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => entry.name)
    .sort()
    .map(parsePost)
    .sort(comparePosts);
}

export function readPostFile(slug: string): BlogPost | null {
  if (!slugPattern.test(slug)) {
    return null;
  }

  const fileName = `${slug}.md`;
  const fullPath = path.join(postsDirectory, fileName);
  if (!fs.existsSync(fullPath)) {
    return null;
  }

  return parsePost(fileName);
}
