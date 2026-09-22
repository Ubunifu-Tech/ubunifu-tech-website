import 'server-only';
import { db } from '@/lib/db';
import type { Prisma } from '@/generated/prisma/client';

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
 * What a project still has to be invoiced for.
 *
 * Fee lines that are planned or active, minus what has already been put on a
 * non-void invoice for that same line. Renewals are included only once their
 * due date is within reach: invoicing next year's hosting today would be a
 * demand for money that is not owed.
 */
export async function billableLines(projectId: string, horizonDays = 45) {
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + horizonDays);

  const lines = await db.lineItem.findMany({
    where: {
      projectId,
      status: { in: ['planned', 'active'] },
      OR: [
        { billingKind: { in: ['one_off', 'installment', 'usage'] } },
        { nextDueAt: { not: null, lte: horizon } },
      ],
    },
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
    },
  });

  return lines.map((line) => {
    const alreadyBilled = line.invoiceLines.reduce(
      (total, invoiceLine) => total + invoiceLine.amountMinor * invoiceLine.quantity,
      0,
    );
    const worth = line.amountMinor * line.quantity;
    return {
      id: line.id,
      label: line.label,
      description: line.description,
      terms: line.terms,
      amountMinor: line.amountMinor,
      quantity: line.quantity,
      currency: line.currency,
      billingKind: line.billingKind,
      nextDueAt: line.nextDueAt,
      alreadyBilled,
      remainingMinor: Math.max(0, worth - alreadyBilled),
    };
  });
}
