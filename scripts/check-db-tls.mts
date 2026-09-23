/**
 * Proves how the app connects to a Postgres that encrypts with its own
 * private certificate authority, the way Railway's does.
 *
 *   npm run check:db-tls
 *
 * Part one checks the rules in src/lib/db-connection.ts without a server.
 * Part two, when initdb and openssl are installed, starts a throwaway Postgres
 * with a Railway-like certificate (a self-made root, a server certificate for
 * "localhost" only) and connects through the real Prisma driver adapter:
 *
 * - sslmode=require passed straight to the driver fails, as it did in
 *   production ("self-signed certificate in certificate chain");
 * - the same URL through databaseTarget connects, encrypted;
 * - a root certificate, from DATABASE_CA_CERT or sslrootcert in the URL,
 *   connects, and the wrong one is refused;
 * - a password with reserved characters survives the URL rewrite.
 *
 * Nothing touches the app's own database. The throwaway one is stopped and
 * deleted, also when the check is interrupted.
 */

import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const { databaseTarget } = await import('../src/lib/db-connection');
const { PrismaPg } = await import('@prisma/adapter-pg');
const { PrismaClient } = await import('../src/generated/prisma/client');

let failures = 0;
async function check(name: string, run: () => unknown | Promise<unknown>) {
  try {
    await run();
    console.log(`PASS  ${name}`);
  } catch (error) {
    failures += 1;
    console.log(`FAIL  ${name}\n      ${(error as Error).message.split('\n')[0]}`);
  }
}

// Everything this check creates lives in one folder, removed on the way out
// however the process ends: normally, on a failure, or on Ctrl-C.
const dir = mkdtempSync(join(process.platform === 'win32' ? tmpdir() : '/tmp', 'ubu-tls-'));
const data = join(dir, 'data');
let serverStarted = false;
let cleaned = false;
function cleanup() {
  if (cleaned) return;
  cleaned = true;
  if (serverStarted) {
    try {
      execFileSync('pg_ctl', ['-D', data, '-m', 'immediate', 'stop'], { stdio: 'ignore', env: { ...process.env, LC_ALL: 'C' } });
    } catch {
      // Already stopped.
    }
  }
  rmSync(dir, { recursive: true, force: true });
}
process.on('exit', cleanup);
// On Ctrl-C, tsx kills this process outright within a few milliseconds, too
// soon to stop Postgres and delete the folder here. A detached shell, outside
// the terminal's process group, does it instead and outlives this process.
for (const [signal, code] of [['SIGINT', 130], ['SIGTERM', 143], ['SIGHUP', 129]] as const) {
  process.on(signal, () => {
    if (!cleaned) {
      cleaned = true;
      spawn('sh', ['-c', 'pg_ctl -D "$1" -m immediate stop; rm -rf "$2"', 'cleanup', data, dir], {
        detached: true,
        stdio: 'ignore',
        env: { ...process.env, LC_ALL: 'C' },
      }).unref();
    }
    process.exit(code);
  });
}

// ── Part one: the rules ─────────────────────────────────────────────────
const RAILWAY = 'postgresql://postgres:p%40ss%2Fw0rd@shuttle.proxy.rlwy.net:41234/railway?sslmode=require&connection_limit=5';
const PEM = '-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----';
const FILE_PEM = '-----BEGIN CERTIFICATE-----\nFROMFILE\n-----END CERTIFICATE-----\n';
const pemFile = join(dir, 'url-root.crt');
writeFileSync(pemFile, FILE_PEM);

await check('local URL without sslmode is left alone', () => {
  const url = 'postgresql://me@localhost:5432/app?schema=public';
  assert.deepEqual(databaseTarget(url, {}), { connectionString: url });
});
await check('sslmode=disable is left alone', () => {
  const url = 'postgresql://me@localhost/app?sslmode=disable';
  assert.deepEqual(databaseTarget(url, {}), { connectionString: url });
});
await check('require: SSL settings leave the URL, other settings stay', () => {
  const target = databaseTarget(RAILWAY, {});
  assert.equal(target.connectionString.includes('sslmode'), false);
  assert.equal(target.connectionString.includes('connection_limit=5'), true);
  assert.equal(target.connectionString.includes('p%40ss%2Fw0rd'), true);
});
await check('require without a CA: encrypted, not verified', () => {
  assert.deepEqual(databaseTarget(RAILWAY, {}).ssl, { rejectUnauthorized: false });
});
await check('require with a CA: verified against it, host name not checked', () => {
  const ssl = databaseTarget(RAILWAY, { DATABASE_CA_CERT: PEM }).ssl!;
  assert.equal(ssl.ca, PEM);
  assert.equal(ssl.rejectUnauthorized, true);
  assert.equal(typeof ssl.checkServerIdentity, 'function');
});
await check('a CA written with \\n escapes is turned back into lines', () => {
  const ssl = databaseTarget(RAILWAY, { DATABASE_CA_CERT: PEM.replace(/\n/g, '\\n') }).ssl!;
  assert.equal(ssl.ca, PEM);
});
await check('no-verify behaves like require', () => {
  assert.deepEqual(databaseTarget(RAILWAY.replace('require', 'no-verify'), {}).ssl, { rejectUnauthorized: false });
});
await check('verify-ca without a CA is refused with a clear message', () => {
  assert.throws(() => databaseTarget(RAILWAY.replace('require', 'verify-ca'), {}), /DATABASE_CA_CERT/);
});
await check('verify-full keeps full checking', () => {
  const ssl = databaseTarget(RAILWAY.replace('require', 'verify-full'), {}).ssl!;
  assert.equal(ssl.rejectUnauthorized, true);
  assert.equal(ssl.checkServerIdentity, undefined);
});
await check('an unknown sslmode is refused rather than guessed', () => {
  assert.throws(() => databaseTarget(RAILWAY.replace('require', 'maybe'), {}), /does not know/);
});
await check('uselibpqcompat and other SSL params are removed too', () => {
  const target = databaseTarget(`${RAILWAY}&uselibpqcompat=true&sslrootcert=${pemFile}`, {});
  assert.equal(/ssl|uselibpqcompat/.test(new URL(target.connectionString).search), false);
});
await check('sslrootcert in the URL is read and trusted, as psql does', () => {
  const ssl = databaseTarget(`${RAILWAY}&sslrootcert=${pemFile}`, { DATABASE_CA_CERT: PEM }).ssl!;
  assert.equal(ssl.ca, FILE_PEM);
  assert.equal(ssl.rejectUnauthorized, true);
});
await check('sslrootcert with verify-full is used for full checking', () => {
  const ssl = databaseTarget(`${RAILWAY.replace('require', 'verify-full')}&sslrootcert=${pemFile}`, {}).ssl!;
  assert.equal(ssl.ca, FILE_PEM);
  assert.equal(ssl.checkServerIdentity, undefined);
});
await check('an sslrootcert that cannot be read stops the connection', () => {
  assert.throws(() => databaseTarget(`${RAILWAY}&sslrootcert=${join(dir, 'missing.crt')}`, {}), /cannot be read/);
});
await check('sslrootcert=system needs verify-full, as in libpq', () => {
  assert.throws(() => databaseTarget(`${RAILWAY}&sslrootcert=system`, {}), /verify-full/);
  const ssl = databaseTarget(`${RAILWAY.replace('require', 'verify-full')}&sslrootcert=system`, { DATABASE_CA_CERT: PEM }).ssl!;
  assert.deepEqual(ssl, { rejectUnauthorized: true });
});
await check('sslcert and sslkey are read for a server that asks for them', () => {
  const ssl = databaseTarget(`${RAILWAY}&sslcert=${pemFile}&sslkey=${pemFile}`, {}).ssl!;
  assert.equal(ssl.cert, FILE_PEM);
  assert.equal(ssl.key, FILE_PEM);
  assert.equal(ssl.rejectUnauthorized, false);
});
await check('sslmode given twice: the last one counts, as in pg and libpq', () => {
  const stricter = databaseTarget(`${RAILWAY}&sslmode=verify-full`, {}).ssl!;
  assert.deepEqual(stricter, { rejectUnauthorized: true });
  const off = `${RAILWAY}&sslmode=disable`;
  assert.deepEqual(databaseTarget(off, {}), { connectionString: off });
});

// ── Part two: a real TLS Postgres ───────────────────────────────────────
function has(command: string) {
  try {
    execFileSync('which', [command], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

if (!has('initdb') || !has('pg_ctl') || !has('openssl')) {
  console.log('\nSkipped the live part: initdb, pg_ctl and openssl are needed.');
} else {
  // The folder is under /tmp because Postgres puts its socket there, and
  // socket paths are limited in length.
  const port = String(55000 + Math.floor(Math.random() * 5000));
  // macOS Postgres refuses to start without a locale in the environment.
  const env = { ...process.env, LC_ALL: 'C', LANG: 'C' };
  const run = (cmd: string, args: string[]) => execFileSync(cmd, args, { cwd: dir, stdio: 'pipe', env });

  try {
    // Railway's recipe: a self-made root, and a server certificate for localhost.
    run('openssl', ['req', '-new', '-x509', '-days', '2', '-nodes', '-subj', '/CN=root-ca', '-keyout', 'root.key', '-out', 'root.crt']);
    run('openssl', ['req', '-new', '-nodes', '-subj', '/CN=localhost', '-keyout', 'server.key', '-out', 'server.csr']);
    writeFileSync(join(dir, 'san.ext'), 'subjectAltName=DNS:localhost\n');
    run('openssl', ['x509', '-req', '-in', 'server.csr', '-days', '2', '-CA', 'root.crt', '-CAkey', 'root.key', '-CAcreateserial', '-out', 'server.crt', '-extfile', 'san.ext']);
    // A second, unrelated authority, to prove a wrong pin is refused.
    run('openssl', ['req', '-new', '-x509', '-days', '2', '-nodes', '-subj', '/CN=other-ca', '-keyout', 'other.key', '-out', 'other.crt']);
    // Postgres serves the whole chain, as Railway's does.
    writeFileSync(join(dir, 'chain.crt'), readFileSync(join(dir, 'server.crt'), 'utf8') + readFileSync(join(dir, 'root.crt'), 'utf8'));
    execFileSync('chmod', ['600', join(dir, 'server.key')]);

    // Passwords are checked over the network, so the URL rewrite has to carry
    // the encoded password through intact; the local socket is trusted, for setup.
    run('initdb', ['-D', data, '-U', 'postgres', '--auth-local=trust', '--auth-host=scram-sha-256']);
    serverStarted = true;
    run('pg_ctl', [
      '-D', data, '-l', join(dir, 'log'), '-w', 'start',
      '-o', `-p ${port} -k ${dir} -c listen_addresses=127.0.0.1,::1 -c ssl=on -c ssl_cert_file=${join(dir, 'chain.crt')} -c ssl_key_file=${join(dir, 'server.key')}`,
    ]);
    run('psql', ['-h', dir, '-p', port, '-U', 'postgres', '-c', "CREATE ROLE app LOGIN PASSWORD 'p@ss/w0rd#?'"]);

    // "db.localhost" reaches this machine but is not the name on the
    // certificate, like Railway's proxy host.
    const url = `postgresql://app:${encodeURIComponent('p@ss/w0rd#?')}@db.localhost:${port}/postgres?sslmode=require`;
    const rootPem = readFileSync(join(dir, 'root.crt'), 'utf8');
    const otherPem = readFileSync(join(dir, 'other.crt'), 'utf8');

    async function encrypted(target: { connectionString: string; ssl?: object }) {
      const client = new PrismaClient({ adapter: new PrismaPg({ ...target, connectionTimeoutMillis: 5000 }) });
      try {
        const rows = await client.$queryRaw<{ ssl: boolean }[]>`SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()`;
        return rows[0]?.ssl === true;
      } finally {
        await client.$disconnect();
      }
    }

    await check('before the fix: sslmode=require straight to the driver fails like production', async () => {
      await assert.rejects(encrypted({ connectionString: url }), /self-signed|TlsConnection|P1011/i);
    });
    await check('the fix: the same URL connects, and the connection is encrypted', async () => {
      assert.equal(await encrypted(databaseTarget(url, {})), true);
    });
    await check('pinned to the right authority: connects, encrypted', async () => {
      assert.equal(await encrypted(databaseTarget(url, { DATABASE_CA_CERT: rootPem })), true);
    });
    await check('pinned to the right authority written with \\n escapes: connects', async () => {
      assert.equal(await encrypted(databaseTarget(url, { DATABASE_CA_CERT: rootPem.replace(/\n/g, '\\n') })), true);
    });
    await check('a wrong password is refused, so the right one really was checked', async () => {
      const wrong = url.replace(encodeURIComponent('p@ss/w0rd#?'), 'nope');
      await assert.rejects(encrypted(databaseTarget(wrong, {})), /password|authentication|P1000/i);
    });
    await check('pinned to the wrong authority: refused', async () => {
      await assert.rejects(encrypted(databaseTarget(url, { DATABASE_CA_CERT: otherPem })));
    });
    await check('sslrootcert in the URL pointing at the right authority: connects', async () => {
      assert.equal(await encrypted(databaseTarget(`${url}&sslrootcert=${join(dir, 'root.crt')}`, {})), true);
    });
    await check('sslrootcert in the URL pointing at the wrong authority: refused', async () => {
      await assert.rejects(encrypted(databaseTarget(`${url}&sslrootcert=${join(dir, 'other.crt')}`, {})));
    });
    await check('verify-full against a certificate for another name: refused', async () => {
      await assert.rejects(encrypted(databaseTarget(url.replace('require', 'verify-full'), { DATABASE_CA_CERT: rootPem })));
    });

  } finally {
    cleanup();
  }
}

if (failures > 0) {
  console.error(`\n${failures} failed.`);
  process.exit(1);
}
console.log('\nThe database connection rules hold.');
