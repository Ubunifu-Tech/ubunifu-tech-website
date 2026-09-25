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

/**
 * Then check the database the APP will actually query.
 *
 * `migrate deploy` only reports on whatever URL it was pointed at, and it
 * decides "up to date" by reading the _prisma_migrations bookkeeping table. Two
 * things can therefore both be true: it prints success, and the running site
 * then dies on a column that does not exist.
 *
 *   1. It migrated a DIFFERENT database. DIRECT_DATABASE_URL is preferred above
 *      for DDL, exactly as prisma.config.ts does. If it ever drifts from
 *      DATABASE_URL — a copied variable, a restored branch, a second Railway
 *      service — the migration lands somewhere the app never reads.
 *   2. The bookkeeping table says applied and the column is not there anyway,
 *      after a resolve, a baseline, or a restore from a snapshot.
 *
 * `migrate status` catches NEITHER, because it reads the same table. Comparing
 * the live schema against prisma/schema.prisma catches both: it is the actual
 * columns that are compared, and --exit-code returns 2 when they differ.
 *
 * Without this the failure surfaces much later as a Prisma error in the middle
 * of page collection, thirty lines under a log line claiming migrations were
 * up to date — which is precisely the sort of build log that sends you looking
 * in the wrong place.
 */
const appUrl = process.env.DATABASE_URL;

if (!appUrl) {
  console.log('[migrate] Migrations applied. No DATABASE_URL to verify against.');
  process.exit(0);
}

if (process.env.DIRECT_DATABASE_URL && process.env.DIRECT_DATABASE_URL !== appUrl) {
  console.log(
    '[migrate] DIRECT_DATABASE_URL and DATABASE_URL differ, which is expected behind a\n' +
      '[migrate] pooler. Verifying the schema against DATABASE_URL, the one the app reads.',
  );
}

// prisma.config.ts resolves DIRECT_DATABASE_URL || DATABASE_URL, so the direct
// URL has to be pinned to the app's own for this child. Deleting it is not
// enough: the config file calls process.loadEnvFile('.env') itself, which
// would put a local DIRECT_DATABASE_URL straight back and verify the wrong
// database. loadEnvFile never overrides a variable that is already set, so
// SETTING it is what holds.
const verifyEnv = { ...process.env, DIRECT_DATABASE_URL: appUrl };

const drift = spawnSync(
  'npx',
  [
    'prisma',
    'migrate',
    'diff',
    '--from-config-datasource',
    '--to-schema',
    'prisma/schema.prisma',
    '--exit-code',
  ],
  { encoding: 'utf8', env: verifyEnv },
);

// 0 = identical, 2 = differs, anything else = the check itself broke.
if (drift.status === 2) {
  console.error(
    '\n[migrate] The database the app reads does NOT match prisma/schema.prisma,' +
      '\n[migrate] even though the migration step reported success. The deployment has' +
      '\n[migrate] been stopped; the previous one stays live.' +
      '\n' +
      '\n[migrate] What is missing from it:\n',
  );
  console.error((drift.stdout || '').trim() || '(no summary returned)');
  console.error(
    '\n[migrate] Usually this means migrations were applied to a different database' +
      '\n[migrate] than DATABASE_URL points at, or _prisma_migrations records a' +
      '\n[migrate] migration whose SQL never actually ran.\n',
  );
  process.exit(1);
}

if (drift.status !== 0) {
  console.error(
    '\n[migrate] Could not verify the schema against DATABASE_URL, so the deployment' +
      '\n[migrate] has been stopped rather than shipped unverified.\n',
  );
  console.error((drift.stderr || drift.stdout || '').trim());
  process.exit(1);
}

console.log('[migrate] Migrations are up to date, and DATABASE_URL matches the schema.');

/**
 * Then the reference data the console needs: the standard terms and a plan
 * template per service line. The loader only adds what is missing, so this is
 * a no-op on every deploy after the first. A failure stops the deploy for the
 * same reason a migration failure does: the site would go live without data
 * its pages expect.
 */
const reference = spawnSync('npx', ['tsx', 'scripts/load-reference-data.mts'], {
  stdio: 'inherit',
  env: process.env,
});

if (reference.status !== 0) {
  console.error(
    '\n[reference] Loading the standard terms and plan templates failed, so the' +
      '\n[reference] deployment has been stopped. The previous deployment stays live.\n',
  );
  process.exit(reference.status ?? 1);
}
