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
if (!url) {
  throw new Error('DATABASE_URL is not set. Copy .env.example to .env and fill it in.');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'npx tsx prisma/seed.ts',
  },
  datasource: { url },
});
