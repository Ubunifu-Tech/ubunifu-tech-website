import 'server-only';
import {
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  type ScryptOptions,
} from 'node:crypto';
import { promisify } from 'node:util';
import { consoleEnv } from './env';

/**
 * promisify collapses scrypt's overloads onto the three-argument form, which
 * drops the options parameter carrying the cost factor. Typed explicitly so the
 * parameters are actually passed rather than silently falling back to Node's
 * defaults.
 */
const scrypt = promisify(scryptCallback) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: ScryptOptions,
) => Promise<Buffer>;

/**
 * Token and password primitives for the console.
 *
 * Two rules hold everywhere here:
 *
 *   1. Raw tokens are returned to the caller exactly once and never stored. The
 *      database keeps an HMAC of the token, so a dump of the tables cannot be
 *      replayed as a session or a signing link.
 *
 *   2. Every comparison of a secret is timing-safe. A plain === on a token hash
 *      leaks its prefix to anyone willing to measure.
 */

/** 32 bytes of entropy, url-safe. Long enough that guessing is not a threat. */
export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Keyed rather than plain SHA-256. A bare hash of a 32-byte random token is
 * already impractical to reverse, but keying it means a leaked database is
 * useless without the secret as well.
 */
export function hashToken(token: string): string {
  return createHmac('sha256', consoleEnv.sessionSecret)
    .update(token)
    .digest('base64url');
}

// ── Passwords ────────────────────────────────────────────────────────────────

const SCRYPT_KEY_LENGTH = 64;
/**
 * N=2^15 is the cost. Deliberately above Node's default 2^14: sign-in is rare
 * and a client's password is worth more than 60ms of a request.
 */
const SCRYPT_PARAMS = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

/** Stored as `scrypt$N$r$p$salt$hash`, so the cost can be raised later without
 *  invalidating existing passwords — the parameters travel with the hash. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scrypt(
    password.normalize('NFKC'),
    salt,
    SCRYPT_KEY_LENGTH,
    SCRYPT_PARAMS,
  )) as Buffer;

  return [
    'scrypt',
    SCRYPT_PARAMS.N,
    SCRYPT_PARAMS.r,
    SCRYPT_PARAMS.p,
    salt.toString('base64url'),
    derived.toString('base64url'),
  ].join('$');
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const [, nRaw, rRaw, pRaw, saltRaw, hashRaw] = parts;
  const N = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) {
    return false;
  }

  const salt = Buffer.from(saltRaw!, 'base64url');
  const expected = Buffer.from(hashRaw!, 'base64url');

  const derived = (await scrypt(password.normalize('NFKC'), salt, expected.length, {
    N,
    r,
    p,
    maxmem: 64 * 1024 * 1024,
  })) as Buffer;

  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

/**
 * Minimum viable password policy: length over composition rules, which push
 * people toward Password1! and no further.
 */
export function passwordProblem(password: string): string | null {
  if (password.length < 12) {
    return 'Use at least 12 characters.';
  }
  if (password.length > 200) {
    return 'That password is too long.';
  }
  if (/^\s|\s$/.test(password)) {
    return 'Remove the space at the start or end.';
  }
  return null;
}
