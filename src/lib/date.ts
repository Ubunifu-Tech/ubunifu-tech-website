/**
 * Shared date formatting for blog surfaces.
 *
 * Three components each re-implemented this: the same UTC-anchored parse and the
 * same NaN guard. Keep the guard — dropping it turns malformed frontmatter into a
 * rendered "Invalid Date" instead of the raw string.
 *
 * Formatters are built once at module scope rather than per call, matching what
 * two of the three copies already did.
 *
 * Deliberately carries no 'use client' and no 'server-only' directive because
 * it is shared by client-side listings and the server-rendered post page.
 */

const shortDate = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

const longDate = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

function format(date: string, fmt: Intl.DateTimeFormat): string {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? date : fmt.format(parsed);
}

/** e.g. "5 Jan 2026" — index and card surfaces. */
export function formatDateShort(date: string): string {
  return format(date, shortDate);
}

/** e.g. "5 January 2026" — the article byline. */
export function formatDateLong(date: string): string {
  return format(date, longDate);
}
