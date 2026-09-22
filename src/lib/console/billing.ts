import 'server-only';
import { db } from '@/lib/db';
import type { Prisma } from '@/generated/prisma/client';
import { HORIZON_DAYS, ensureRenewalEvents } from './renewals';

/**
 * Invoices, payments and receipts.
 *
 * Everything here is integer minor units. Nothing divides, nothing converts
 * currency, and nothing touches a float — the only division in the system is in
 * the formatter, at the moment a number becomes text.
 *
 * Two numbers are denormalised onto Invoice for listing screens: totalMinor and
 * paidMinor. Both are derived, so both can drift, and the only defence against
 * that is that they are recomputed from their source rows inside the same
 * transaction that changes those rows. Nothing else is allowed to set them.
 */

/**
 * INV-2026-007. Sequential within the calendar year, derived from the highest
 * number already issued rather than from a row count — a voided invoice keeps
 * its number, and reusing it would make two different demands for money look
 * like the same one.
 */
export async function nextInvoiceNumber(
  tx: Prisma.TransactionClient,
  now = new Date(),
): Promise<string> {
  const prefix = `INV-${now.getFullYear()}-`;
  const latest = await tx.invoice.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: 'desc' },
    select: { number: true },
  });
  const previous = latest ? Number.parseInt(latest.number.slice(prefix.length), 10) : 0;
  const next = Number.isFinite(previous) ? previous + 1 : 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

/** RCP-2026-012, on the same rule and for the same reason. */
export async function nextReceiptNumber(
  tx: Prisma.TransactionClient,
  now = new Date(),
): Promise<string> {
  const prefix = `RCP-${now.getFullYear()}-`;
  const latest = await tx.receipt.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: 'desc' },
    select: { number: true },
  });
  const previous = latest ? Number.parseInt(latest.number.slice(prefix.length), 10) : 0;
  const next = Number.isFinite(previous) ? previous + 1 : 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

/**
 * Recomputes an invoice's totals from the rows that actually hold the money,
 * and moves its status to match.
 *
 * Called inside the transaction that added or removed a line or a payment, so
 * the denormalised figures can never be observed disagreeing with their source.
 * Status is derived here too: there is no screen where someone types "paid"
 * into an invoice, because a status that can be set by hand stops meaning
 * anything the moment one person sets it wrongly.
 */
export async function recomputeInvoice(
  tx: Prisma.TransactionClient,
  invoiceId: string,
): Promise<void> {
  const invoice = await tx.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    select: {
      status: true,
      taxMinor: true,
      dueAt: true,
      issuedAt: true,
      paidAt: true,
      lines: { select: { amountMinor: true, quantity: true } },
      payments: { select: { amountMinor: true, receivedAt: true } },
    },
  });

  const subtotalMinor = invoice.lines.reduce(
    (total, line) => total + line.amountMinor * line.quantity,
    0,
  );
  const totalMinor = subtotalMinor + invoice.taxMinor;
  const paidMinor = invoice.payments.reduce((total, payment) => total + payment.amountMinor, 0);

  // A void invoice stays void. It is a decision, not a balance.
  if (invoice.status === 'void') return;

  let status = invoice.status;
  if (invoice.status === 'draft') {
    // A draft stays a draft until somebody sends it, whatever has been paid.
    status = 'draft';
  } else if (paidMinor >= totalMinor && totalMinor > 0) {
    status = 'paid';
  } else if (paidMinor > 0) {
    status = 'part_paid';
  } else if (invoice.dueAt && invoice.dueAt.getTime() < Date.now()) {
    status = 'overdue';
  } else {
    status = 'sent';
  }

  /**
   * paidAt is the date of the payment that settled it, not the moment the row
   * was typed in. Someone entering Friday's transfer on Monday should not move
   * the invoice's payment date to Monday.
   */
  const settledOn =
    status === 'paid'
      ? invoice.paidAt ??
        invoice.payments
          .map((payment) => payment.receivedAt)
          .sort((a, b) => b.getTime() - a.getTime())[0] ??
        new Date()
      : null;

  await tx.invoice.update({
    where: { id: invoiceId },
    data: { subtotalMinor, totalMinor, paidMinor, status, paidAt: settledOn },
  });
}

/**
 * What a project can be invoiced for right now.
 *
 * Two different shapes share this list, because they are billed differently:
 *
 *   A ONE-OFF or INSTALLMENT is a fixed amount that gets billed once. What is
 *   left is its worth minus whatever has already been put on a non-void
 *   invoice, so a half-billed deposit can be finished and a fully billed one
 *   disappears.
 *
 *   A RECURRING line is not an amount at all — it is an amount owed again every
 *   interval, for ever. It is offered as a PERIOD, from RenewalEvent, and
 *   billing one marks that period and moves the line on to the next. Treating
 *   it like a one-off is what made a renewal billable exactly once.
 */
export type Billable = {
  /** What the form posts. Carries which period, when there is one. */
  key: string;
  lineItemId: string;
  renewalEventId: string | null;
  label: string;
  terms: string | null;
  amountMinor: number;
  currency: string;
  billingKind: string;
  /** The period this covers, for a renewal. */
  periodStart: Date | null;
  periodEnd: Date | null;
  dueAt: Date | null;
};

export async function billableLines(projectId: string, horizonDays = 45): Promise<Billable[]> {
  /**
   * Periods close enough to bill may not exist as rows yet. Materialised at
   * least as far as this call is going to look — otherwise the filter below
   * could ask for a period further out than anything that was created, and
   * report nothing to bill when there is something.
   */
  await ensureRenewalEvents({ projectId }, Math.max(horizonDays, HORIZON_DAYS));

  const horizon = new Date();
  horizon.setDate(horizon.getDate() + horizonDays);

  const lines = await db.lineItem.findMany({
    where: { projectId, status: { in: ['planned', 'active'] } },
    orderBy: { position: 'asc' },
    select: {
      id: true,
      label: true,
      description: true,
      terms: true,
      amountMinor: true,
      quantity: true,
      currency: true,
      billingKind: true,
      nextDueAt: true,
      invoiceLines: {
        where: { invoice: { status: { not: 'void' } } },
        select: { amountMinor: true, quantity: true },
      },
      renewals: {
        where: { status: 'pending', dueAt: { lte: horizon } },
        orderBy: { periodStart: 'asc' },
        select: { id: true, periodStart: true, periodEnd: true, dueAt: true },
      },
    },
  });

  const billable: Billable[] = [];

  for (const line of lines) {
    const recurring =
      line.billingKind === 'recurring_monthly' || line.billingKind === 'recurring_annual';

    if (recurring) {
      for (const renewal of line.renewals) {
        billable.push({
          key: `renewal:${renewal.id}`,
          lineItemId: line.id,
          renewalEventId: renewal.id,
          label: line.label,
          terms: line.terms,
          amountMinor: line.amountMinor * line.quantity,
          currency: line.currency,
          billingKind: line.billingKind,
          periodStart: renewal.periodStart,
          periodEnd: renewal.periodEnd,
          dueAt: renewal.dueAt,
        });
      }
      continue;
    }

    const alreadyBilled = line.invoiceLines.reduce(
      (total, invoiceLine) => total + invoiceLine.amountMinor * invoiceLine.quantity,
      0,
    );
    const remaining = Math.max(0, line.amountMinor * line.quantity - alreadyBilled);
    if (remaining === 0) continue;

    billable.push({
      key: `line:${line.id}`,
      lineItemId: line.id,
      renewalEventId: null,
      label: line.label,
      terms: line.terms,
      amountMinor: remaining,
      currency: line.currency,
      billingKind: line.billingKind,
      periodStart: null,
      periodEnd: null,
      dueAt: null,
    });
  }

  return billable;
}

