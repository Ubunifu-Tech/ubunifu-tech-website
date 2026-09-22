import { existsSync } from 'node:fs';

/**
 * These checks read the prerendered HTML that `next build` emits, so they need
 * a production build present. Without this guard a missing .next surfaces as a
 * raw ENOENT stack trace from readFileSync, which reads like the check found a
 * real fault rather than like it never ran.
 */
export function requireBuild(route) {
  const path = `.next/server/app/${route}`;
  if (existsSync(path)) return path;

  console.error(
    `\nThis check reads ${path}, which does not exist yet.\n` +
      `Run \`npm run build\` first, then re-run the check.\n` +
      `(\`npm run dev\` writes to .next/dev and is not enough.)\n`,
  );
  process.exit(1);
}
