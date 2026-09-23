/**
 * Moves the markdown files in _posts/ into the database, once.
 *
 * The files were the blog until the CMS existed. This reads them through the
 * same parser the site used, so a post arrives in the database exactly as it
 * was being served — same slug, same date, same tags, same cover, same body —
 * and nothing about what a reader sees changes on the day of the switch.
 *
 * Idempotent, keyed on slug: a post already in the database is never touched.
 * Once imported, the row is the source of truth and the file is the old copy,
 * so a re-run only ever adds posts that are missing.
 *
 * Run with: npx tsx scripts/import-posts.mts
 */
process.loadEnvFile('.env');

import { createRequire } from 'node:module';

// `server-only` throws on import by design; Next swaps it for an empty module
// when the importer really is server code. Outside Next nothing does that.
const requireFromHere = createRequire(import.meta.url);
const serverOnly = requireFromHere.resolve('server-only');
const Module = requireFromHere('node:module').Module;
requireFromHere.cache[serverOnly] = new Module(serverOnly);
requireFromHere.cache[serverOnly]!.filename = serverOnly;
requireFromHere.cache[serverOnly]!.loaded = true;
requireFromHere.cache[serverOnly]!.exports = {};

const { PrismaPg } = await import('@prisma/adapter-pg');
const { databaseTarget } = await import('../src/lib/db-connection');
const { PrismaClient } = await import('../src/generated/prisma/client');
const { readPostFiles } = await import('../src/lib/blog-files');

const db = new PrismaClient({
  adapter: new PrismaPg(databaseTarget(process.env.DATABASE_URL!)),
});

const files = readPostFiles();
if (files.length === 0) {
  console.log('No markdown files in _posts/ — nothing to import.');
  await db.$disconnect();
  process.exit(0);
}

// Posts are credited to the owner internally; the visible byline comes from
// the file's own frontmatter.
const owner = await db.staffUser.findFirst({
  where: { role: 'owner' },
  select: { id: true },
});

let created = 0;
let skipped = 0;

for (const post of files) {
  const existing = await db.post.findUnique({
    where: { slug: post.slug },
    select: {
      id: true,
      title: true,
      excerpt: true,
      bodyMarkdown: true,
      tags: true,
      coverImage: true,
      coverAlt: true,
    },
  });

  if (existing) {
    /*
     * Compared by CONTENT, not by timestamps. This used to treat
     * updatedAt > createdAt as "edited in the console" — but this script's own
     * update moves updatedAt, so the third run skipped every post and blamed
     * the console for an edit nobody made. What actually matters is whether
     * the row still says what the file says.
     */
    const same =
      existing.title === post.title &&
      existing.excerpt === post.excerpt &&
      existing.bodyMarkdown === post.content.trim() &&
      JSON.stringify(existing.tags) === JSON.stringify(post.tags) &&
      existing.coverImage === (post.coverImage ?? null) &&
      existing.coverAlt === (post.coverAlt ?? null);

    if (same) {
      console.log(`  same     ${post.slug}`);
      skipped += 1;
      continue;
    }

    // Different, and we cannot tell who changed what. The database is the
    // source of truth now, so it wins; say so rather than guess why.
    console.log(`  skipped  ${post.slug} — the database copy differs from the file, and the database wins`);
    skipped += 1;
    continue;
  }

  const data = {
    title: post.title,
    excerpt: post.excerpt,
    bodyMarkdown: post.content.trim(),
    status: 'published' as const,
    tags: post.tags,
    coverImage: post.coverImage ?? null,
    coverAlt: post.coverAlt ?? null,
    authorId: owner?.id ?? null,
    authorName: post.author,
    publishedAt: new Date(`${post.date}T09:00:00.000Z`),
  };

  await db.post.create({ data: { slug: post.slug, ...data } });
  console.log(`  created  ${post.slug}`);
  created += 1;
}

await db.$disconnect();

console.log(
  `\n${files.length} file${files.length === 1 ? '' : 's'} read: ${created} created, ${skipped} left alone.`,
);
