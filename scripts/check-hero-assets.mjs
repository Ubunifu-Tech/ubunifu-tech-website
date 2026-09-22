import { readFileSync } from 'node:fs';
import { requireBuild } from './require-build.mjs';

const routes = {
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

const failures = [];
let scenesChecked = 0;

function readRoute(route) {
  return readFileSync(requireBuild(`${route}.html`), 'utf8');
}

for (const [route, expectedScene] of Object.entries(routes)) {
  const html = readRoute(route);
  const markers = [...html.matchAll(/data-page-scene="([^"]+)"/g)];

  if (markers.length !== 1 || markers[0][1] !== expectedScene) {
    failures.push(`${route}: expected one ${expectedScene} page scene`);
  }

  for (const [markup, scene, content] of html.matchAll(
    /<div\b[^>]*\bdata-page-scene="([^"]+)"[^>]*>([\s\S]*?)<\/div>/gi,
  )) {
    scenesChecked++;
    if (/<(?:text|foreignObject|span|p)\b/i.test(content) || content.replace(/<[^>]*>/g, '').trim()) {
      failures.push(`${route}: ${scene} page scene contains visible wording`);
    }
    if (!content.includes('viewBox="0 0 640 440"') || !content.includes('preserveAspectRatio="xMidYMid meet"')) {
      failures.push(`${route}: ${scene} page scene does not preserve its composition`);
    }
    const wrapper = markup.slice(0, markup.indexOf('>'));
    if (!/role="img"[^>]*aria-label="[^"]+"/.test(wrapper)) {
      failures.push(`${route}: ${scene} page scene needs an accessible description`);
    }
  }

  if ([...html.matchAll(/<h1\b/g)].length !== 1) {
    failures.push(`${route}: expected one visible page heading`);
  }

  for (const [img] of html.matchAll(/<img\b[^>]*>/gi)) {
    if (/hero-[a-z-]+-v1\.webp|service-[a-z-]+-v1\.webp/.test(img)) {
      failures.push(`${route}: retired raster hero or service art is still rendered`);
    }
  }
}

const home = readRoute('index');
if (!home.includes('data-home-redesign')) failures.push('Homepage: missing the custom light hero');
if ([...home.matchAll(/<h1\b/g)].length !== 1) failures.push('Homepage: expected one visible page heading');
if (/data-hero-art|data-hero-drawn/.test(home)) failures.push('Homepage: retired hero markers are still rendered');

const blog = readRoute('blog');
for (const kind of ['journey', 'learning', 'ledger', 'decision', 'workshop', 'pricing']) {
  if (!blog.includes(`data-story-visual="${kind}"`)) {
    failures.push(`Blog: missing ${kind} story visual`);
  }
}

if (!scenesChecked) failures.push('No shared page scenes found in rendered routes');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Hero visual check passed: ${scenesChecked} wordless page scenes and six shared blog compositions.`);
}
