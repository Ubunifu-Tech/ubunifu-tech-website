/**
 * Adds the console's reference data to a database that does not have it yet:
 * the standard terms and one starting plan per service line.
 *
 *   npx tsx scripts/load-reference-data.mts
 *
 * Run by scripts/migrate-deploy.mjs on every deploy, after migrations. It only
 * ever creates what is missing, so on every deploy after the first it changes
 * nothing, and it can never undo an edit made in the console. It does not
 * touch clients, projects or anything else a person entered; that sample data
 * belongs to the local seed alone.
 */

import { PrismaPg } from '@prisma/adapter-pg';

try {
  process.loadEnvFile('.env');
} catch {
  // No .env file: expected on Vercel and in CI.
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.log('[reference] No DATABASE_URL, so no reference data was loaded.');
  process.exit(0);
}

// Imported after the environment is loaded, and by relative path rather than
// the app's @/ alias, which tsx does not resolve here.
const { databaseTarget } = await import('../src/lib/db-connection');
const { PrismaClient } = await import('../src/generated/prisma/client');
const { loadTemplates, loadTerms } = await import('../prisma/reference-data');

const db = new PrismaClient({ adapter: new PrismaPg(databaseTarget(url)) });

try {
  const templates = await loadTemplates(db, { rebuild: false });
  const terms = await loadTerms(db, { effectiveFrom: new Date() });
  console.log(
    `[reference] Plan templates added: ${templates}. ` +
      (terms.created
        ? `Standard terms published as version ${terms.version}.`
        : `Standard terms already on version ${terms.version}, left as they are.`),
  );
} finally {
  await db.$disconnect();
}
