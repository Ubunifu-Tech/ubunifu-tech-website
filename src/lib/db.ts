import 'server-only';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import { databaseTarget } from './db-connection';

/**
 * One Prisma client for the whole process, created on first use.
 *
 * LAZY ON PURPOSE. Next imports every route module while collecting page data
 * at build time, so constructing the client at module scope made `next build`
 * fail on any environment without a DATABASE_URL — which is every Vercel
 * preview deployment that has no database attached. Importing this module is
 * now always safe; only touching the database needs a connection, and that
 * fails at request time with a clear message instead of taking the build down.
 *
 * Next's dev server re-evaluates modules on every edit, so the instance is
 * cached on globalThis in development. Without it each hot reload would open
 * another pool and Postgres would eventually refuse new connections. The cache
 * is dev-only: in production the module is evaluated once, and a global would
 * only hide a leak.
 *
 * Prisma 7 takes the connection through a driver adapter rather than a `url` in
 * schema.prisma, which is why the pool is configured here.
 */

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set, so the database cannot be reached. ' +
        'Copy .env.example to .env locally, or set it in the Vercel project settings.',
    );
  }

  return new PrismaClient({
    adapter: new PrismaPg({
      // The URL with its SSL settings turned into an explicit TLS config:
      // see db-connection.ts for why sslmode cannot be left to the driver.
      ...databaseTarget(connectionString),
      /**
       * Vercel runs each function in its own container, so every warm instance
       * holds its own pool. Railway's Postgres has a finite connection limit,
       * and a handful of instances with the pg default of 10 each will exhaust
       * it. Small pool, short idle timeout: reconnecting is cheaper than being
       * refused.
       */
      max: Number(process.env.DATABASE_POOL_MAX ?? 5),
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    }),
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

const globalForDb = globalThis as unknown as { db?: PrismaClient };

function client(): PrismaClient {
  if (!globalForDb.db) {
    const instance = createClient();
    if (process.env.NODE_ENV !== 'production') {
      globalForDb.db = instance;
      return instance;
    }
    globalForDb.db = instance;
  }
  return globalForDb.db;
}

/**
 * Proxied so `db.project.findMany()` constructs the client on the first
 * property access rather than when this module is imported.
 */
export const db = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    const value = Reflect.get(client(), property, receiver);
    return typeof value === 'function' ? value.bind(client()) : value;
  },
  has(_target, property) {
    return Reflect.has(client(), property);
  },
});
