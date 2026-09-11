import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const routes = {
  index: 'home',
  build: 'services',
  work: 'work',
  products: 'products',
  about: 'about',
  industries: 'industries',
  contact: 'contact',
  blog: 'journal',
  careers: 'careers',
  brand: 'brand',
  privacy: 'privacy',
};
/** Routes whose hero is drawn in code rather than served as an image. */
const drawnRoutes = new Set(['index']);
const failures = [];

for (const [route, scene] of Object.entries(routes)) {
  const html = readFileSync(join('.next/server/app', `${route}.html`), 'utf8');
  const markers = [...html.matchAll(/data-hero-art="([^"]+)"/g)];
  if (markers.length !== 1 || markers[0][1] !== scene) failures.push(`${route}: expected one ${scene} background`);
  // The home hero is drawn (HeroSystem.tsx) rather than photographed, so it is
  // checked for the drawing instead of for a raster file. Every other route still
  // has to ship its scene image inside the budget.
  if (drawnRoutes.has(route)) {
    if (!html.includes('data-hero-drawn')) failures.push(`${route}: expected the drawn hero system`);
  } else {
    const filename = `hero-${scene}-v1.webp`;
    if (!html.includes(filename)) failures.push(`${route}: missing hero image`);
    const size = statSync(join('public/editorial', filename)).size;
    if (size > 350_000) failures.push(`${route}: hero exceeds the 350 kB source budget`);
  }
  if ([...html.matchAll(/<h1\b/g)].length !== 1) failures.push(`${route}: expected one visible page heading`);
}

const services = readFileSync('.next/server/app/build.html', 'utf8');
for (const subject of ['branding', 'strategy']) {
  const filename = `service-${subject}-v1.webp`;
  if (!services.includes(filename)) failures.push(`Services: missing ${subject} illustration`);
  if (statSync(join('public/editorial', filename)).size > 350_000) failures.push(`Services: ${subject} exceeds image budget`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Hero assets check passed: 11 distinct page backgrounds (${drawnRoutes.size} drawn), 2 service illustrations, single page headings and image budgets.`);
}
