import { businessDay } from './money';

/**
 * The yearly reference sequences: INV-2026-007, RCP-, RFN-, TCK-, UBU- and the
 * document prefixes. Pure, so the rule can be checked without a database.
 */

/**
 * The year a reference is numbered in: Tanzania's, not the server's. On a
 * server running in UTC, something raised between 00:00 and 03:00 on
 * 1 January in Tanzania would otherwise take last year's prefix.
 */
export function businessYear(now: Date): number {
  return Number(businessDay(now).slice(0, 4));
}

/**
 * The next reference after those already issued with this prefix, numbered
 * from the highest one rather than from a count, so a voided or removed
 * record's number is never handed out again.
 *
 * Compared as numbers, not as text: ordered as text, '999' comes after
 * '1000', which left the sequence stuck at 1000 in a busy year.
 */
export function nextInSequence(prefix: string, taken: string[]): string {
  const highest = taken
    .map((value) => Number.parseInt(value.slice(prefix.length), 10))
    .filter((value) => Number.isFinite(value))
    .reduce((max, value) => Math.max(max, value), 0);
  return `${prefix}${String(highest + 1).padStart(3, '0')}`;
}
