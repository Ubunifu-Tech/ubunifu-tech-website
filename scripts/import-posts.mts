/**
 * Moves the markdown files in _posts/ into the database, once.
 *
 * The files were the blog until the CMS existed. This reads them through the
 * same parser the site used, so a post arrives in the database exactly as it
 * was being served — same slug, same date, same tags, same cover, same body —
 * and nothing about what a reader sees changes on the day of the switch.
 *
 * Idempotent, keyed on slug: re-running updates rather than duplicating. It
 * refuses to overwrite a post that has been edited in the console since it was
 * imported, because at that point the file is the stale copy, not the row.
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
const { PrismaClient } = await import('../src/generated/prisma/client');
const { readPostFiles } = await import('../src/lib/blog-files');

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
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
let updated = 0;
let skipped = 0;

for (const post of files) {
  const existing = await db.post.findUnique({
    where: { slug: post.slug },
    select: { id: true, createdAt: true, updatedAt: true },
  });

  if (existing) {
    // A row whose updatedAt has moved past its createdAt has been touched in
    // the console. The file is the old copy at that point.
    const edited = existing.updatedAt.getTime() - existing.createdAt.getTime() > 2000;
    if (edited) {
      console.log(`  skipped  ${post.slug} — edited in the console since it was imported`);
      skipped += 1;
      continue;
    }
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

  if (existing) {
    await db.post.update({ where: { slug: post.slug }, data });
    console.log(`  updated  ${post.slug}`);
    updated += 1;
  } else {
    await db.post.create({ data: { slug: post.slug, ...data } });
    console.log(`  created  ${post.slug}`);
    created += 1;
  }
}

await db.$disconnect();

console.log(
  `\n${files.length} file${files.length === 1 ? '' : 's'} read: ${created} created, ${updated} updated, ${skipped} left alone.`,
);
