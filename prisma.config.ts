import { defineConfig } from 'prisma/config';

/**
 * Prisma 7 moved the connection URL out of schema.prisma. The CLI reads it from
 * here; the runtime client gets it through the pg driver adapter in
 * src/lib/db.ts. Both read the same DATABASE_URL, so there is still one source.
 *
 * The CLI does not load .env on its own, and config files are evaluated before
 * Next.js would. process.loadEnvFile is Node's own loader, so no dotenv
 * dependency is needed just to run a migration.
 */
try {
  process.loadEnvFile('.env');
} catch {
  // Fine in CI or production, where DATABASE_URL is already in the environment.
}

/**
 * Migrations run against a direct connection. If a pooler is ever put in front
 * of Railway (PgBouncer in transaction mode cannot run DDL or advisory locks),
 * set DIRECT_DATABASE_URL to the direct connection and leave DATABASE_URL
 * pointing at the pooler for the app. Until then the two are the same.
 */
const url = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;

/**
 * Deliberately does NOT throw when the URL is missing.
 *
 * `prisma generate` loads this file but needs no database — only migrate and
 * introspect do. Throwing here broke `next build` on any environment without a
 * DATABASE_URL, which is every Vercel preview deployment that has no database
 * attached. A preview of a marketing copy change should not fail because the
 * console has nowhere to migrate to.
 *
 * Commands that genuinely need the connection still fail on their own, and
 * scripts/migrate-deploy.mjs skips the migration rather than guessing.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'npx tsx prisma/seed.ts',
  },
  ...(url ? { datasource: { url } } : {}),
});
