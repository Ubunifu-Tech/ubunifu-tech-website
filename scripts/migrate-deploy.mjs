#!/usr/bin/env node
/**
 * Applies pending migrations during the Vercel build.
 *
 * Migrations run on every deploy, which is what we want: code and schema ship
 * together, and a deploy whose migration failed must not go live. That does
 * mean a broken migration takes the marketing site down with it, and that is
 * the right trade — serving pages against a schema they were not written for is
 * worse than serving the previous deploy.
 *
 * The one case that is NOT worth failing on is a build with no database
 * configured at all. Preview deployments and branch builds frequently have no
 * DATABASE_URL, and failing them would block every preview of a marketing copy
 * change. Those skip the migration and build the site; the console simply has
 * no database to talk to, which it reports at runtime rather than at build.
 *
 * Anything else — a URL that is set but unreachable, a migration that errors —
 * fails loudly, because those mean production is about to be wrong.
 */

import { spawnSync } from 'node:child_process';

/**
 * Vercel injects environment variables directly, but a local `npm run build`
 * would otherwise skip the migration and behave differently from production —
 * which defeats the point of testing the build locally at all.
 */
try {
  process.loadEnvFile('.env');
} catch {
  // No .env file: expected on Vercel and in CI.
}

const url = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;

if (!url) {
  console.warn(
    '\n[migrate] No DATABASE_URL set, so no migrations were applied.' +
      '\n[migrate] This is expected for a preview build without a database.' +
      '\n[migrate] If you are seeing this on production, the environment variable is missing.\n',
  );
  process.exit(0);
}

// Never print the credentials themselves into a build log.
const redacted = url.replace(/\/\/[^@]*@/, '//<credentials>@');
console.log(`[migrate] Applying migrations to ${redacted}`);

const result = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
  stdio: 'inherit',
  env: process.env,
});

if (result.status !== 0) {
  console.error(
    '\n[migrate] Migration failed, so the deployment has been stopped.' +
      '\n[migrate] The previous deployment stays live. Fix the migration and redeploy.\n',
  );
  process.exit(result.status ?? 1);
}

console.log('[migrate] Migrations are up to date.');
