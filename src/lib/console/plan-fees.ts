import { moneyCapText, overMoneyCap, parseMoney } from './money';

/** One of a plan's fees, as the create forms offer it. */
export type PlanFee = { position: number; label: string; billingKind: string; amountMinor: number };

/**
 * The plan's fees as the new client and new project forms posted them: the
 * ticked ones, each with the price typed beside it, if any. Undefined when the
 * form had no fee list, so a form opened before it existed adds every fee as
 * it always did. A price left empty keeps the plan's own, which may be none.
 */
export function readChosenFees(
  formData: FormData,
  currency: string,
): { fees: { position: number; amountMinor: number | null }[] | undefined } | { error: string } {
  if (formData.get('planFees') !== 'on') return { fees: undefined };
  const fees: { position: number; amountMinor: number | null }[] = [];
  for (const raw of formData.getAll('fee')) {
    const position = Number(raw);
    if (!Number.isInteger(position)) continue;
    const typed = String(formData.get(`feeAmount:${position}`) ?? '').trim();
    if (!typed) {
      fees.push({ position, amountMinor: null });
      continue;
    }
    const amountMinor = parseMoney(typed, currency);
    if (amountMinor === null) {
      return {
        error: overMoneyCap(typed, currency)
          ? `A fee cannot be more than ${moneyCapText(currency)}.`
          : 'One of the fee prices is not an amount. Leave it empty to price it later.',
      };
    }
    fees.push({ position, amountMinor });
  }
  return { fees };
}
