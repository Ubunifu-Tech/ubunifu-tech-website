import 'server-only';
import type { Billable } from '@/lib/console/billing';
import { formatMoney, formatShortDate } from '@/lib/console/money';
import { periodLabel } from '@/lib/console/renewals';
import type { BillableLine } from './RaiseInvoice';

/**
 * What can be invoiced on a project, as the raise-an-invoice form shows it.
 * A usage fee is offered with no price too: its amount is typed each time.
 */
export function linesToRaise(billable: Billable[]): BillableLine[] {
  return billable
    .filter((item) => item.amountMinor > 0 || item.usage)
    .map((item) => ({
      key: item.key,
      label: item.label,
      terms: item.terms,
      amount: formatMoney(item.amountMinor, item.currency),
      amountMinor: item.amountMinor,
      currency: item.currency,
      // A renewal says which period it covers; a one-off says when it is due.
      period:
        item.periodStart && item.periodEnd ? periodLabel(item.periodStart, item.periodEnd) : null,
      due: item.dueAt ? formatShortDate(item.dueAt) : null,
      usage: item.usage,
    }));
}
