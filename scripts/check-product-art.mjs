import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const html = readFileSync('.next/server/app/products.html', 'utf8');
const rows = new Map([...html.matchAll(/<article\b[^>]*data-product="([^"]+)"[^>]*>([\s\S]*?)<\/article>/g)].map((match) => [match[1], match[2]]));
const failures = [];

for (const id of ['insight', 'sifa', 'rafiki']) {
  const row = rows.get(id);
  if (!row) {
    failures.push(`Missing ${id} product row`);
    continue;
  }
  if (!row.includes(`data-product-art="${id}"`)) failures.push(`${id}: missing artwork`);
  const image = row.match(/<img\b[^>]*>/)?.[0] ?? '';
  const filename = `product-${id}-v1.webp`;
  if (!image.includes(filename)) failures.push(`${id}: wrong illustration`);
  if (!/alt="[^"]+"/.test(image)) failures.push(`${id}: missing image description`);
  if (!image.includes('loading="lazy"')) failures.push(`${id}: below-hero image should lazy-load`);
  if (statSync(join('public/editorial', filename)).size > 350_000) failures.push(`${id}: image exceeds 350 kB source budget`);

  if (id === 'rafiki') {
    if (!row.includes('In development') || !row.includes('Coming soon') || /<a\b/.test(row)) {
      failures.push('Rafiki must retain its in-development status and noninteractive CTA');
    }
  } else {
    const link = row.match(/<a\b[^>]*>/)?.[0] ?? '';
    if (!link.includes(`https://${id}.ubunifutech.com`) || !link.includes('rel="noopener noreferrer"')) {
      failures.push(`${id}: live product link or external-link safeguards changed`);
    }
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Product artwork check passed: 3 distinct lazy-loaded images, descriptions, budgets, live links and Rafiki availability.');
}
