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
 * The largest amount one figure may hold, in minor units: TZS or US$ one
 * trillion. The money columns are 64-bit, and this keeps every sum of them
 * far inside the range a JavaScript number holds exactly.
 */
export const MONEY_CAP_MINOR = 100_000_000_000_000;

/**
 * A money column read from the database as an ordinary number. The columns
 * are bigint so any real amount fits; the code adds and compares numbers,
 * which hold every amount under the cap exactly. Refuses rather than rounds
 * a value that would not be exact.
 */
export function minor(value: bigint | number): number {
  const amount = Number(value);
  if (!Number.isSafeInteger(amount)) {
    throw new RangeError(`An amount of ${value} is too large to handle exactly.`);
  }
  return amount;
}

/** A database row with every bigint in it, however deep, read as a number. */
export type Numbers<T> = T extends bigint
  ? number
  : T extends string | number | boolean | null | undefined
    ? T
    : T extends Date | ((...args: never[]) => unknown) | { toFixed: (...args: never[]) => string }
      ? T
      : T extends readonly (infer Item)[]
        ? Numbers<Item>[]
        : T extends object
          ? { [Key in keyof T]: Numbers<T[Key]> }
          : T;

/**
 * Reads a query result's money columns as numbers, including those of
 * nested rows such as an invoice's payments, so a result is converted once,
 * where it leaves the database. Dates and decimals are left as they are.
 */
export function numbers<T>(value: T): Numbers<T> {
  if (typeof value === 'bigint') return minor(value) as Numbers<T>;
  if (Array.isArray(value)) return value.map((item) => numbers(item)) as Numbers<T>;
  if (value !== null && typeof value === 'object') {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return value as Numbers<T>;
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, numbers(item)]),
    ) as Numbers<T>;
  }
  return value as Numbers<T>;
}

/** The limit as a person reads it, in that currency. */
export function moneyCapText(currency: string): string {
  return formatMoney(MONEY_CAP_MINOR, currency);
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
  if (!Number.isSafeInteger(minor) || Math.abs(minor) > MONEY_CAP_MINOR) return null;
  return minor;
}

/**
 * Whether what was typed reads as a number but is over the limit, so the form
 * can say so instead of 'enter an amount'.
 */
export function overMoneyCap(input: string, currency: string): boolean {
  const cleaned = input.replace(/[^\d.,-]/g, '').replace(/,/g, '');
  if (!/^-?\d*\.?\d*$/.test(cleaned) || cleaned === '' || cleaned === '-') return false;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return false;
  return Math.abs(Math.round(value * 10 ** minorUnitScale(currency))) > MONEY_CAP_MINOR;
}

/** East Africa Time is UTC+3 all year: no daylight saving to account for. */
export const BUSINESS_TIME_ZONE = 'Africa/Dar_es_Salaam';

const DAY_KEY = new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TIME_ZONE });
const LONG_DATE = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: BUSINESS_TIME_ZONE,
});
const SHORT_DATE = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: BUSINESS_TIME_ZONE,
});
const TIME = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: BUSINESS_TIME_ZONE,
});

/** The day a moment falls on in Tanzania, as YYYY-MM-DD. */
export function businessDay(value: Date): string {
  return DAY_KEY.format(value);
}

/**
 * Dates read on Tanzania's calendar. A typed date is stored at noon UTC
 * (15:00 there), so it reads as typed; a moment, such as a signature at 01:30,
 * reads as the day it happened there, not the UTC day before.
 */
export function formatDate(value: Date | null | undefined): string {
  if (!value) return 'Not set';
  return LONG_DATE.format(value);
}

export function formatShortDate(value: Date | null | undefined): string {
  if (!value) return 'Not set';
  return SHORT_DATE.format(value);
}

/** The time of day in Tanzania, as 14:05, whatever clock the browser keeps. */
export function formatTime(value: Date): string {
  return TIME.format(value);
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
export function todayInput(): string {
  return businessDay(new Date());
}

/** For <input type="date">, which only ever speaks YYYY-MM-DD. */
export function toDateInputValue(value: Date | null | undefined): string {
  return value ? businessDay(value) : '';
}

/**
 * Whether a due date has passed, on Tanzania's calendar: something due on
 * 1 October is late from 00:00 on 2 October there, not from any hour of the 1st.
 */
export function isPastDay(value: Date | null | undefined, now: Date): boolean {
  return !!value && businessDay(now) > businessDay(value);
}

/** Whole days from one date to another, counted on Tanzania's calendar. */
export function daysBetween(from: Date, to: Date): number {
  return Math.round((Date.parse(businessDay(to)) - Date.parse(businessDay(from))) / 86_400_000);
}

/** A date some days from today, stored at noon UTC like a typed date. */
export function daysFromToday(days: number): Date {
  const date = parseDateInput(todayInput())!;
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}
