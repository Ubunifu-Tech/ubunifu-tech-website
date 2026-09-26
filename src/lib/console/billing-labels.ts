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

/**
 * How an invoice stands today. The stored status changes only when the
 * invoice is touched, so one past its due date and still owed is overdue
 * from the date itself, whether or not anything has happened to it since.
 */
export function invoiceStanding(
  invoice: { status: string; dueAt: Date | null; totalMinor: number; paidMinor: number },
  now: Date,
): string {
  const owing = invoice.status === 'sent' || invoice.status === 'part_paid';
  if (
    owing &&
    invoice.dueAt !== null &&
    invoice.dueAt.getTime() < now.getTime() &&
    invoice.paidMinor < invoice.totalMinor
  ) {
    return 'overdue';
  }
  return invoice.status;
}

/**
 * An invoice as the client reads it: what they have to do about it, not
 * what we did with it. "Sent" is our side of the story; theirs is "to pay".
 */
export function portalInvoiceState(
  invoice: { status: string; dueAt: Date | null; totalMinor: number; paidMinor: number },
  now: Date,
): { label: string; tone: 'good' | 'bad' | 'warn' | 'neutral'; owing: boolean } {
  if (invoice.status === 'void') return { label: 'Cancelled', tone: 'neutral', owing: false };
  const standing = invoiceStanding(invoice, now);
  if (standing === 'paid' || invoice.paidMinor >= invoice.totalMinor) {
    return { label: 'Paid', tone: 'good', owing: false };
  }
  if (standing === 'overdue') return { label: 'Overdue', tone: 'bad', owing: true };
  const part = invoice.paidMinor > 0 ? 'Part paid' : 'To pay';
  return { label: part, tone: 'warn', owing: true };
}

export const INVOICE_STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  part_paid: 'Part paid',
  paid: 'Paid',
  overdue: 'Overdue',
  void: 'Void',
};
