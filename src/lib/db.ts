import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

/**
 * One Prisma client for the whole process.
 *
 * Next's dev server re-evaluates modules on every edit, so without the global
 * cache each hot reload would open another connection pool and Postgres would
 * eventually refuse new ones. The global is dev-only on purpose: in production
 * the module is evaluated once and the cache would only hide a leak.
 *
 * Prisma 7 takes the connection through a driver adapter rather than a `url` in
 * schema.prisma, which is why the pool is constructed here.
 */

const connectionString = process.env.DATABASE_URL;

function createClient() {
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Copy .env.example to .env and fill it in.',
    );
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log:
      process.env.NODE_ENV === 'development'
        ? ['warn', 'error']
        : ['error'],
  });
}

const globalForDb = globalThis as unknown as { db?: PrismaClient };

export const db = globalForDb.db ?? createClient();

if (process.env.NODE_ENV !== 'production') {
  globalForDb.db = db;
}
