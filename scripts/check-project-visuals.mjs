import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { requireBuild } from './require-build.mjs';

// Run after the production build. This checks rendered source, not browser layout.
const routes = [
  ['index', ['operations', 'enquiry']],
  ['build', ['operations', 'enquiry']],
  ['work', ['operations', 'enquiry']],
  ['work/safari-king', ['operations']],
  ['work/usambara-destination', ['enquiry']],
  ['industries', ['operations']],
  ['blog', ['operations']],
  ['blog/safari-king-website-operating-system', ['operations']],
];
const failures = [];
let diagramsChecked = 0;

for (const [route, kinds] of routes) {
  const html = readFileSync(join('.next/server/app', `${route}.html`), 'utf8');
  for (const kind of kinds) {
    if (!html.includes(`data-project-diagram="${kind}"`)) {
      failures.push(`${route}: missing ${kind} diagram`);
    }
  }
  for (const [markup, kind, content] of html.matchAll(/<div\b[^>]*\bdata-system-diagram="([^"]+)"[^>]*>([\s\S]*?)<\/div>/gi)) {
    diagramsChecked++;
    if (/<(?:text|foreignObject|span|p)\b/i.test(content) || content.replace(/<[^>]*>/g, '').trim()) {
      failures.push(`${route}: ${kind} diagram contains visible wording`);
    }
    if (!content.includes('viewBox="0 0 640 400"') || !content.includes('preserveAspectRatio="xMidYMid meet"')) {
      failures.push(`${route}: ${kind} diagram does not preserve its composition`);
    }
    const wrapper = markup.slice(0, markup.indexOf('>'));
    if (!wrapper.includes('aria-hidden="true"') && !/role="img"[^>]*aria-label="[^"]+"/.test(wrapper)) {
      failures.push(`${route}: ${kind} diagram needs one accessible description or decorative semantics`);
    }
  }
  for (const [img] of html.matchAll(/<img\b[^>]*>/gi)) {
    if (/safari-field-v3|usambara-landscape-v3/.test(img)) {
      failures.push(`${route}: retired landscape is still an in-page image`);
    }
  }
  if (route === 'index' && /Replay the build|SystemsField|Ubunifu Technologies · Arusha/.test(html)) {
    failures.push('Homepage still contains the retired hero assembly or strapline');
  }
  if (route === 'build') {
    for (const kind of ['web', 'hosting', 'branding', 'data', 'ai', 'strategy']) {
      if (!html.includes(`data-system-diagram="${kind}"`)) failures.push(`Services: missing ${kind} SVG`);
    }
    for (const [img] of html.matchAll(/<img\b[^>]*>/gi)) {
      if (/web-responsive-design|hosting-domains-email|business-reporting|grounded-ai-review/.test(img)) {
        failures.push('Services: a replaced raster illustration is still rendered');
      }
    }
  }
}

if (!diagramsChecked) failures.push('No shared SVG diagrams found in the rendered routes');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Visuals check passed: ${diagramsChecked} wordless SVG diagrams across ${routes.length} rendered routes.`);
}
