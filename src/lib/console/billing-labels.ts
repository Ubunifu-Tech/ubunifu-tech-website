/**
 * Billing vocabulary, with no server imports.
 *
 * Kept apart from billing.ts on purpose. That module is `server-only` and
 * pulls in Prisma, so a client component importing a constant from it would
 * drag the database driver into the browser bundle — which is exactly what
 * happened the first time these lived there. Anything both sides need goes
 * here; anything that touches the database stays there.
 */

export const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'mobile_money', label: 'Mobile money' },
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Something else' },
] as const;

export const INVOICE_STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  part_paid: 'Part paid',
  paid: 'Paid',
  overdue: 'Overdue',
  void: 'Void',
};
