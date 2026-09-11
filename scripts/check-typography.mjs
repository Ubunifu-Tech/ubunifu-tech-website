import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const allowedSize = /^var\(--font-size-(caption|small|body|lead|title|heading|display)\)$/;
const failures = [];
let declarations = 0;

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

for (const file of walk('src')) {
  if (file.endsWith('.css')) {
    const source = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const match of source.matchAll(/\bfont-size\s*:\s*([^;}]+)/g)) {
      const value = match[1].replace(/\s*!important$/, '').trim();
      declarations++;
      if (!allowedSize.test(value) && value !== 'inherit') failures.push(`${file}: unapproved font size ${value}`);
    }
    if (!file.endsWith('BrandMark.module.css')) {
      for (const match of source.matchAll(/\bletter-spacing\s*:\s*([^;}]+)/g)) {
        const tracking = match[1].trim();
        if (tracking !== 'normal' && tracking !== 'var(--tracking-display)') {
          failures.push(`${file}: tracking must be normal or var(--tracking-display) outside the logo`);
        }
      }
      for (const rule of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const body = rule[2];
        if (!/font-size\s*:\s*var\(--font-size-body\)/.test(body)) continue;
        const weight = body.match(/font-weight\s*:\s*([^;}]+)/)?.[1].trim();
        if (weight && weight !== 'inherit' && weight !== 'var(--font-weight-regular)') {
          failures.push(`${file}: body-size text must use regular weight (${rule[1].trim()})`);
        }
      }
      for (const match of source.matchAll(/\bfont-weight\s*:\s*([^;}]+)/g)) {
        const value = match[1].trim();
        if (!/^var\(--font-weight-(regular|medium|emphasis)\)$/.test(value) && value !== 'inherit') {
          failures.push(`${file}: unapproved font weight ${value}`);
        }
      }
    }
  }
  // Social-card artwork is a separate image composition, not live site typography.
  if (file.endsWith('.tsx') && !file.endsWith('lib/og.tsx')) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/fontSize\s*:\s*(['"])(.*?)\1/g)) {
      if (!allowedSize.test(match[2])) failures.push(`${file}: inline font size ${match[2]}`);
    }
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Typography check passed: ${declarations} size declarations use the shared role scale; body weights and tracking are consistent.`);
}
