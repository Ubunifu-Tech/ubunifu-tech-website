import type { BillingKind, LineItemStatus } from '@/generated/prisma/client';

/**
 * How a fee is billed, in words. Plain data so the fee editor in the browser
 * and the contract generator on the server say exactly the same thing.
 */
export const BILLING: Record<
  BillingKind,
  { label: string; description: string; per: string }
> = {
  one_off: { label: 'One-off', description: 'Paid once, for example the build', per: '' },
  installment: {
    label: 'Instalment',
    description: 'One part of a fee split into payments',
    per: '',
  },
  recurring_monthly: { label: 'Monthly', description: 'Billed every month', per: ' a month' },
  recurring_annual: {
    label: 'Yearly',
    description: 'Billed every year, like a domain or hosting',
    per: ' a year',
  },
  usage: { label: 'By usage', description: 'Charged for what is used', per: ' per unit' },
};

export const BILLING_OPTIONS = (Object.keys(BILLING) as BillingKind[]).map((value) => ({
  value,
  label: BILLING[value].label,
  description: BILLING[value].description,
}));

export function isRecurring(kind: BillingKind): boolean {
  return kind === 'recurring_monthly' || kind === 'recurring_annual';
}

/** Which fees count: the ones still expected to be billed. */
export const COUNTED_STATUSES: LineItemStatus[] = ['planned', 'active'];

export const FEE_STATUS_LABEL: Record<LineItemStatus, string> = {
  planned: 'Planned',
  active: 'Active',
  deferred: 'Deferred',
  paused: 'Paused',
  waived: 'Waived',
  cancelled: 'Removed',
};
