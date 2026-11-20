import { parseDateInput, toDateInputValue } from './money';

/**
 * When the rest of a part payment is due.
 *
 * Shared by the Record payment form, which shows the date before anything is
 * saved, and by the action, which writes it, so the two cannot disagree. Days
 * are "YYYY-MM-DD" on Tanzania's calendar, the shape a date field holds, and
 * compare as text.
 *
 * A one-off fee has no date of its own, so a renewal's date must not decide
 * when its balance is due: a deposit on a build plus a hosting year due
 * tomorrow made the whole build balance overdue the day after. The balance is
 * due on the payment terms from today. Only when every fee on the invoice is a
 * renewal does a fee's date count, and then never sooner than the terms.
 */
export function balanceDueDay({
  today,
  termsDays,
  feeDays,
}: {
  today: string;
  termsDays: number;
  /** Each fee's own due day: a renewal period's, or null for a fee with none. */
  feeDays: (string | null)[];
}): string {
  const onTerms = addDays(today, Math.max(0, termsDays));
  const dated = feeDays.filter((day): day is string => day !== null);
  if (dated.length === 0 || dated.length < feeDays.length) return onTerms;
  const latest = dated.sort().at(-1)!;
  return latest > onTerms ? latest : onTerms;
}

/**
 * The balance's due day as the form sent it, checked: a real day, not before
 * today. Empty means the form did not ask, and the rule above decides.
 */
export function chosenBalanceDay(raw: string, today: string): { day: string | null } | { error: string } {
  const typed = raw.trim();
  if (!typed) return { day: null };
  const date = parseDateInput(typed);
  if (!date) return { error: 'Enter the date the balance is due.' };
  const day = toDateInputValue(date);
  if (day < today) return { error: 'The balance cannot be due before today.' };
  return { day };
}

/** A day plus whole days, on the calendar. */
export function addDays(day: string, days: number): string {
  const date = parseDateInput(day);
  if (!date) throw new Error(`Not a day: ${day}`);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateInputValue(date);
}
