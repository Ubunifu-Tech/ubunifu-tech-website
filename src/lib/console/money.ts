/**
 * Money and dates, formatted the same way everywhere.
 *
 * Amounts are integer minor units throughout the schema — 22500 is USD 225.00,
 * never 225.0 — because a float cannot hold a two-decimal amount exactly and a
 * rounding error in an invoice is a rounding error in what a client is asked to
 * pay. Nothing converts to a float; the decimal point is inserted by the
 * formatter at the very edge, for display only.
 */

/** Currencies whose smallest unit is the unit itself. */
const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'VND', 'UGX', 'RWF', 'XOF', 'XAF']);

export function minorUnitScale(currency: string): number {
  return ZERO_DECIMAL.has(currency.toUpperCase()) ? 0 : 2;
}

/**
 * Shillings are priced in whole amounts, so cents on every figure are noise:
 * "TZS 350,000", not "TZS 350,000.00". They are still stored in cents like
 * any two-decimal currency, and an amount that does have cents (VAT on an odd
 * figure) still shows them.
 */
const WHOLE_UNLESS_CENTS = new Set(['TZS', 'KES']);

export function formatMoney(amountMinor: number, currency: string): string {
  const fractionDigits = minorUnitScale(currency);
  const divisor = 10 ** fractionDigits;
  const shown =
    WHOLE_UNLESS_CENTS.has(currency.toUpperCase()) && amountMinor % divisor === 0 ? 0 : fractionDigits;

  // en-GB rather than the server's locale, so a build machine's settings
  // cannot change what an invoice says.
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: shown,
    maximumFractionDigits: shown,
  }).format(amountMinor / divisor);
}

/**
 * Minor units back into what a person types, without touching a float:
 * 150000 USD is "1500.00", 35000000 TZS is "350000".
 */
export function moneyInput(amountMinor: number, currency: string): string {
  const scale = minorUnitScale(currency);
  if (scale === 0) return String(amountMinor);
  const divisor = 10 ** scale;
  const sign = amountMinor < 0 ? '-' : '';
  const units = Math.trunc(Math.abs(amountMinor) / divisor);
  const fraction = Math.abs(amountMinor) % divisor;
  if (fraction === 0 && WHOLE_UNLESS_CENTS.has(currency.toUpperCase())) return `${sign}${units}`;
  return `${sign}${units}.${String(fraction).padStart(scale, '0')}`;
}

/**
 * Parses what a person typed into minor units.
 *
 * Returns null rather than NaN or zero for anything it cannot read, so a typo
 * becomes a validation error instead of a silent nil amount on an invoice.
 * Accepts thousands separators and a leading currency symbol, because people
 * paste from spreadsheets.
 */
export function parseMoney(input: string, currency: string): number | null {
  const cleaned = input.replace(/[^\d.,-]/g, '').replace(/,/g, '');
  if (!/^-?\d*\.?\d*$/.test(cleaned) || cleaned === '' || cleaned === '-') return null;

  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;

  const scale = 10 ** minorUnitScale(currency);
  const minor = Math.round(value * scale);

  // Beyond this a later sum could exceed Number.MAX_SAFE_INTEGER, and the
  // column is an Int anyway.
  if (!Number.isSafeInteger(minor) || Math.abs(minor) > 2_000_000_000) return null;
  return minor;
}

export function formatDate(value: Date | null | undefined): string {
  if (!value) return 'Not set';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(value);
}

export function formatShortDate(value: Date | null | undefined): string {
  if (!value) return 'Not set';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(value);
}

/**
 * "3 days ago", "in 2 weeks". Used for renewal dates and update timestamps,
 * where the distance matters more than the date itself.
 */
export function formatRelative(value: Date | null | undefined, now: Date): string {
  if (!value) return 'Never';

  const seconds = Math.round((value.getTime() - now.getTime()) / 1000);
  const absolute = Math.abs(seconds);
  const formatter = new Intl.RelativeTimeFormat('en-GB', { numeric: 'auto' });

  const steps: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['week', 604_800],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ];

  for (const [unit, size] of steps) {
    if (absolute >= size) return formatter.format(Math.round(seconds / size), unit);
  }
  return 'just now';
}

/**
 * Reads what an <input type="date"> posted.
 *
 * Parsed at noon UTC rather than midnight, so a date does not slide to the
 * previous day for anyone east of Greenwich — which, for a Tanzanian business,
 * is everyone. Returns null for anything unreadable, so a typo becomes a
 * validation error rather than an Invalid Date written to a column.
 */
export function parseDateInput(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Today's date where the business is, for a date field's default and limit.
 * The server runs in UTC, and in the first three hours of a Tanzanian morning
 * UTC is still yesterday, so a payment that arrived at 1 a.m. would default to
 * the day before and could not be dated today.
 */
export function todayInput(timeZone = 'Africa/Dar_es_Salaam'): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
}

/** For <input type="date">, which only ever speaks YYYY-MM-DD. */
export function toDateInputValue(value: Date | null | undefined): string {
  if (!value) return '';
  return value.toISOString().slice(0, 10);
}
