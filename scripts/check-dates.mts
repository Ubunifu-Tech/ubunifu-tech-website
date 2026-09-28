/**
 * Dates read on Tanzania's calendar, and stay that way.
 *
 * Two parts. The first checks the helpers at the moments where UTC and
 * Tanzania disagree: 21:00 to 23:59 UTC is already the next day there, and
 * a due date stored at noon UTC is 15:00 there. The second walks src/ and
 * refuses the two patterns that brought the UTC calendar back in before:
 * formatting with timeZone 'UTC', and cutting a date out of toISOString().
 * Typed dates go through toDateInputValue or businessDay; moments through
 * formatDate and formatShortDate, all in src/lib/console/money.ts.
 *
 * Needs no database. Run with: npm run check:dates (it sets TZ=UTC, like
 * the servers, so a laptop's own time zone cannot hide a mistake).
 */
import { createRequire } from 'node:module';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const requireFromHere = createRequire(import.meta.url);
const serverOnly = requireFromHere.resolve('server-only');
const Module = requireFromHere('node:module').Module;
requireFromHere.cache[serverOnly] = new Module(serverOnly);
requireFromHere.cache[serverOnly]!.filename = serverOnly;
requireFromHere.cache[serverOnly]!.loaded = true;
requireFromHere.cache[serverOnly]!.exports = {};

const money = await import('../src/lib/console/money');
const finance = await import('../src/lib/console/finance');
const { invoiceStanding } = await import('../src/lib/console/billing-labels');

const failures: string[] = [];
const expect = (name: string, got: unknown, want: unknown) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    failures.push(`${name}: got ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`);
  }
};

// ── Part 1: the helpers at the boundaries ───────────────────────────────

const lateNight = new Date('2026-09-30T22:30:00Z'); // 01:30 on 1 October in Tanzania
const typed = money.parseDateInput('2026-10-01')!; // noon UTC, 15:00 there

expect('formatDate of a moment', money.formatDate(lateNight), '1 October 2026');
expect('formatShortDate of a moment', money.formatShortDate(lateNight), '1 Oct 2026');
expect('formatTime of a moment', money.formatTime(lateNight), '01:30');
expect('formatDate of a typed date', money.formatDate(typed), '1 October 2026');
expect('formatDate at midnight UTC', money.formatDate(new Date('2026-10-01T00:00:00Z')), '1 October 2026');
expect('toDateInputValue of a moment', money.toDateInputValue(new Date('2026-09-30T21:45:00Z')), '2026-10-01');
expect('toDateInputValue of a typed date', money.toDateInputValue(money.parseDateInput('2026-10-14')), '2026-10-14');
expect('isPastDay before midnight there', money.isPastDay(typed, new Date('2026-10-01T20:59:00Z')), false);
expect('isPastDay from midnight there', money.isPastDay(typed, new Date('2026-10-01T21:00:00Z')), true);
expect('isPastDay of nothing', money.isPastDay(null, lateNight), false);
expect('daysBetween', money.daysBetween(typed, new Date('2026-10-05T22:00:00Z')), 5);
expect(
  'daysFromToday is a typed date',
  money.daysFromToday(14).toISOString().endsWith('T12:00:00.000Z'),
  true,
);

expect('monthKey of a moment', finance.monthKey(new Date('2026-08-31T21:45:00Z')), '2026-09');
expect('monthKey of a typed date', finance.monthKey(money.parseDateInput('2026-08-31')!), '2026-08');
const thisMonth = finance.periodFor('this-month', new Date('2026-09-30T22:00:00Z'));
expect('this month, months', thisMonth.months, ['2026-10']);
expect('this month, from', thisMonth.from.toISOString(), '2026-09-30T21:00:00.000Z');
expect('this month, to', thisMonth.to.toISOString(), '2026-10-31T21:00:00.000Z');
expect(
  'this year ends in the month it is in Tanzania',
  finance.periodFor('this-year', new Date('2026-09-30T22:00:00Z')).months.at(-1),
  '2026-10',
);

const owing = { status: 'sent', dueAt: typed, totalMinor: 100, paidMinor: 0 };
expect('due today at 17:00 there is not overdue', invoiceStanding(owing, new Date('2026-10-01T14:00:00Z')), 'sent');
expect('due yesterday is overdue from midnight', invoiceStanding(owing, new Date('2026-10-01T21:00:00Z')), 'overdue');

// ── Part 2: no UTC calendar in src/ ─────────────────────────────────────

const root = new URL('../src/', import.meta.url).pathname;
const FORBIDDEN: [RegExp, string][] = [
  [/timeZone:\s*'UTC'/, "formats a date in UTC: use the money.ts helpers or 'Africa/Dar_es_Salaam'"],
  [/toISOString\(\)\s*\.slice\(0,\s*(7|10)\)/, 'cuts a date out of toISOString(): use toDateInputValue, businessDay or monthKey'],
];
/** Where the UTC reading is the point: checking frontmatter dates round-trip. */
const ALLOWED = new Set(['lib/blog-files.ts']);

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'generated' ? [] : walk(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

for (const file of walk(root)) {
  const name = relative(root, file);
  if (ALLOWED.has(name)) continue;
  const text = readFileSync(file, 'utf8');
  for (const [pattern, why] of FORBIDDEN) {
    const found = text.match(pattern);
    if (found?.index !== undefined) {
      const line = text.slice(0, found.index).split('\n').length;
      failures.push(`src/${name}:${line} ${why}`);
    }
  }
}

if (failures.length > 0) {
  console.error(`\nDates check failed:\n${failures.map((f) => `  ${f}`).join('\n')}\n`);
  process.exit(1);
}
console.log('Dates check passed: every helper reads Tanzania\'s calendar, and nothing in src/ formats dates in UTC.');
