import { readFileSync } from 'node:fs';
import type { ConnectionOptions } from 'node:tls';

/**
 * How the app's Postgres driver (node-postgres, through @prisma/adapter-pg)
 * connects, worked out from DATABASE_URL.
 *
 * Why this exists. node-postgres reads `sslmode=require` as "verify the
 * certificate fully", unlike every libpq tool, where it means "encrypt, do not
 * verify". Railway's Postgres presents a certificate from its own private
 * authority, issued for localhost, so full verification always fails and the
 * app could not reach its database ("self-signed certificate in certificate
 * chain"). And any SSL setting left in the URL replaces an `ssl` object passed
 * in code (pg/lib/connection-parameters.js), so the settings have to come out
 * of the URL and be given here instead.
 *
 * The root certificate, when there is one, comes from `sslrootcert` in the URL
 * (a file path, as in psql) or else from DATABASE_CA_CERT (the PEM itself,
 * which is what fits in an environment variable on Vercel).
 *
 * What each sslmode gives:
 * - none or `disable`: plain connection, URL untouched (local Postgres).
 * - `require`, `prefer`, `allow`, `no-verify`: encrypted. Verified against the
 *   root certificate when there is one, otherwise not verified. That is libpq's
 *   `require`, and what the Prisma CLI already does.
 * - `verify-ca`: encrypted and verified against the root certificate, which
 *   must be given. The host name is not checked, because Railway's certificate
 *   names localhost rather than the proxy host.
 * - `verify-full`: encrypted and fully verified, against the root certificate
 *   when given, otherwise against the public roots.
 *
 * A setting given twice counts by its last value, as in pg and libpq, so a
 * stricter sslmode appended to a URL is the one that applies.
 *
 * Used by the app and by every script that opens its own connection, so the
 * rule is the same everywhere. The Prisma CLI (migrations) does not use it: it
 * runs its own engine, which already reads `require` the libpq way.
 */

const SSL_PARAMS = ['ssl', 'sslmode', 'sslcert', 'sslkey', 'sslrootcert', 'sslnegotiation', 'uselibpqcompat'];

const ENCRYPT_ONLY = new Set(['require', 'prefer', 'allow', 'no-verify']);

export type PoolTarget = { connectionString: string; ssl?: ConnectionOptions };

export function databaseTarget(
  raw: string,
  env: Record<string, string | undefined> = process.env,
): PoolTarget {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    // Not a URL the WHATWG parser understands (a unix socket path, say).
    // Handed to pg untouched; it has its own parser.
    return { connectionString: raw };
  }

  const last = (key: string) => url.searchParams.getAll(key).at(-1) || null;
  const mode = last('sslmode')?.toLowerCase() ?? null;
  if (!mode || mode === 'disable') return { connectionString: raw };

  const rootCertPath = last('sslrootcert');
  const certPath = last('sslcert');
  const keyPath = last('sslkey');
  for (const key of SSL_PARAMS) url.searchParams.delete(key);
  const connectionString = url.toString();

  if (rootCertPath === 'system' && mode !== 'verify-full') {
    // libpq refuses this pairing too: the public roots only mean something
    // with the host name checked.
    throw new Error('DATABASE_URL uses sslrootcert=system, which needs sslmode=verify-full.');
  }
  const ca =
    rootCertPath === 'system'
      ? null
      : rootCertPath
        ? readPem(rootCertPath, 'sslrootcert')
        : env.DATABASE_CA_CERT?.trim()
          ? env.DATABASE_CA_CERT.replace(/\\n/g, '\n').trim()
          : null;

  // A client certificate, for a server that asks for one. Railway does not.
  const client: ConnectionOptions = {};
  if (certPath) client.cert = readPem(certPath, 'sslcert');
  if (keyPath) client.key = readPem(keyPath, 'sslkey');

  if (mode === 'verify-full') {
    return { connectionString, ssl: { ...client, ...(ca ? { ca } : {}), rejectUnauthorized: true } };
  }

  if (mode === 'verify-ca') {
    if (!ca) {
      throw new Error(
        'DATABASE_URL asks for sslmode=verify-ca, but gives no root certificate. ' +
          "Set DATABASE_CA_CERT to the database's root certificate, or use sslmode=require.",
      );
    }
    return { connectionString, ssl: { ...client, ...pinned(ca) } };
  }

  if (ENCRYPT_ONLY.has(mode)) {
    return { connectionString, ssl: { ...client, ...(ca ? pinned(ca) : { rejectUnauthorized: false }) } };
  }

  throw new Error(`DATABASE_URL has an sslmode this app does not know: ${mode}.`);
}

/** Trust only this authority, and do not check the host name against it. */
function pinned(ca: string): ConnectionOptions {
  return { ca, rejectUnauthorized: true, checkServerIdentity: () => undefined };
}

/** A certificate or key named in the URL. Missing means stop, never skip. */
function readPem(path: string, param: string): string {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    throw new Error(`DATABASE_URL names ${param}=${path}, but that file cannot be read.`);
  }
}
