/**
 * The currencies work can be priced and invoiced in.
 *
 * One list, shared by the client form, the project form and a project's own
 * currency switch, so a currency offered in one place is accepted in all of
 * them. money.ts formats any ISO-4217 code, so adding one here is enough.
 *
 * TZS keeps its ISO minor unit (100 senti) like the others: amounts already
 * stored in TZS are in senti, and reading them any other way would multiply or
 * divide every figure on an invoice by a hundred.
 */
export const CURRENCIES = ['USD', 'TZS', 'EUR', 'GBP', 'KES'] as const;

export type Currency = (typeof CURRENCIES)[number];

const NAME: Record<Currency, string> = {
  USD: 'US dollars',
  TZS: 'Tanzanian shillings',
  EUR: 'Euros',
  GBP: 'British pounds',
  KES: 'Kenyan shillings',
};

export function isCurrency(value: string): value is Currency {
  return (CURRENCIES as readonly string[]).includes(value);
}

/** "Tanzanian shillings (TZS)", or the bare code for one no longer offered. */
export function currencyLabel(code: string): string {
  return isCurrency(code) ? `${NAME[code]} (${code})` : code;
}
