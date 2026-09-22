/**
 * The database copy of a post must be identical to the file it came from.
 *
 * The blog moved from markdown files to the Post table. Every page that
 * renders a post is unchanged, which only holds if what comes back is the same
 * — so this compares the two sources field by field and fails on any drift.
 *
 * Run with: npx tsx scripts/check-blog-parity.mts
 */
process.loadEnvFile('.env');

import { createRequire } from 'node:module';

const requireFromHere = createRequire(import.meta.url);
const serverOnly = requireFromHere.resolve('server-only');
const Module = requireFromHere('node:module').Module;
requireFromHere.cache[serverOnly] = new Module(serverOnly);
requireFromHere.cache[serverOnly]!.filename = serverOnly;
requireFromHere.cache[serverOnly]!.loaded = true;
requireFromHere.cache[serverOnly]!.exports = {};

const { readPostFiles } = await import('../src/lib/blog-files');
const { getAllPostsOrThrow } = await import('../src/lib/blog');

const files = readPostFiles();
const rows = await getAllPostsOrThrow();

const failures: string[] = [];

if (files.length !== rows.length) {
  failures.push(`${files.length} files but ${rows.length} published posts.`);
}

const bySlug = new Map(rows.map((post) => [post.slug, post]));

for (const file of files) {
  const row = bySlug.get(file.slug);
  if (!row) {
    failures.push(`${file.slug}: in the files, missing from the database.`);
    continue;
  }

  const fields: (keyof typeof file)[] = [
    'title',
    'date',
    'author',
    'excerpt',
    'coverImage',
    'coverAlt',
    'readingTime',
  ];

  for (const field of fields) {
    if (file[field] !== row[field]) {
      failures.push(
        `${file.slug}.${String(field)}: file ${JSON.stringify(file[field])} vs database ${JSON.stringify(row[field])}`,
      );
    }
  }

  if (file.tags.join('|') !== row.tags.join('|')) {
    failures.push(`${file.slug}.tags: ${file.tags.join(', ')} vs ${row.tags.join(', ')}`);
  }

  if (file.content.trim() !== row.content.trim()) {
    failures.push(`${file.slug}.content: bodies differ.`);
  }
}

// Order matters: the index page renders them in the order it is handed.
const fileOrder = files.map((post) => post.slug).join(',');
const rowOrder = rows.map((post) => post.slug).join(',');
if (fileOrder !== rowOrder) {
  failures.push(`order differs:\n  files: ${fileOrder}\n  db:    ${rowOrder}`);
}

if (failures.length > 0) {
  console.error(`\nThe database copy has drifted from the files:\n\n${failures.join('\n')}\n`);
  process.exitCode = 1;
} else {
  console.log(
    `Blog parity check passed: ${rows.length} posts are identical in the database and the files, in the same order.`,
  );
}
