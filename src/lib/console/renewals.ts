import 'server-only';
import { db } from '@/lib/db';
import type { Prisma } from '@/generated/prisma/client';

/**
 * Renewals, one period at a time.
 *
 * A recurring fee line is not a single amount that gets billed once — it is a
 * new amount owed every interval, forever, until somebody stops it. Before this
 * existed the code treated a recurring line like any other: it summed what had
 * ever been invoiced against the line and offered the difference, so once year
 * one was billed the difference was zero and YEAR TWO COULD NEVER BE INVOICED.
 * The line also sat on the renewals list at its year-one date for ever, because
 * nothing advanced it.
 *
 * A RenewalEvent is one period: when it starts, when it ends, when it is due,
 * and whether it has been invoiced. `@@unique([lineItemId, periodStart])` is
 * what makes materialising them safe to repeat — two people opening the same
 * screen cannot create the same period twice.
 *
 * LineItem.nextDueAt stays the anchor: it always points at the earliest period
 * that has not been invoiced, and it moves forward only when one is.
 */

/** How far ahead periods are materialised by default. A year, plus slack. */
export const HORIZON_DAYS = 400;

/** A guard against a bad interval turning one line into ten thousand rows. */
const MAX_PERIODS_PER_LINE = 24;

export function addMonths(from: Date, months: number): Date {
  const date = new Date(from);
  const day = date.getUTCDate();
  date.setUTCMonth(date.getUTCMonth() + months);
  // Rolling 31 January forward by a month must land on 28/29 February, not on
  // 3 March — which is what setUTCMonth does on its own.
  if (date.getUTCDate() < day) date.setUTCDate(0);
  return date;
}

export function intervalFor(billingKind: string): number | null {
  if (billingKind === 'recurring_monthly') return 1;
  if (billingKind === 'recurring_annual') return 12;
  return null;
}

/**
 * Materialises the periods that are now close enough to matter.
 *
 * Called on demand — from the renewals screen and from the billing lookup —
 * rather than by a scheduled job, because there is no scheduler here and a
 * screen nobody opens does not need rows. Idempotent: the unique constraint
 * turns a repeat into a no-op.
 */
export async function ensureRenewalEvents(
  where: Prisma.LineItemWhereInput = {},
  horizonDays: number = HORIZON_DAYS,
): Promise<number> {
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + horizonDays);

  const lines = await db.lineItem.findMany({
    where: {
      ...where,
      status: { in: ['planned', 'active'] },
      nextDueAt: { not: null },
      billingKind: { in: ['recurring_monthly', 'recurring_annual'] },
      project: { deletedAt: null, status: { notIn: ['closed', 'cancelled'] } },
    },
    select: {
      id: true,
      nextDueAt: true,
      intervalMonths: true,
      billingKind: true,
      renewals: { select: { periodStart: true } },
    },
  });

  let created = 0;

  for (const line of lines) {
    const months = line.intervalMonths ?? intervalFor(line.billingKind);
    if (!months || months < 1) continue;

    const known = new Set(line.renewals.map((renewal) => renewal.periodStart.getTime()));
    let periodStart = line.nextDueAt!;

    for (let index = 0; index < MAX_PERIODS_PER_LINE; index += 1) {
      if (periodStart.getTime() > horizon.getTime()) break;

      if (!known.has(periodStart.getTime())) {
        const periodEnd = addMonths(periodStart, months);
        try {
          await db.renewalEvent.create({
            data: {
              lineItemId: line.id,
              periodStart,
              periodEnd,
              // The money is due at the start of the period it covers.
              dueAt: periodStart,
            },
          });
          created += 1;
        } catch (error) {
          // A unique violation means somebody else materialised the same
          // period a moment ago, which is exactly what should happen.
          if ((error as { code?: string }).code !== 'P2002') throw error;
        }
      }

      periodStart = addMonths(periodStart, months);
    }
  }

  return created;
}

/**
 * Marks a period invoiced and moves the line on.
 *
 * Both halves belong in one transaction: a period recorded as invoiced while
 * the line still points at it would be offered for billing again, and a line
 * moved on without the period recorded would lose the only evidence that the
 * year was ever charged for.
 */
export async function markRenewalInvoiced(
  tx: Prisma.TransactionClient,
  renewalEventId: string,
  invoiceId: string,
): Promise<void> {
  const renewal = await tx.renewalEvent.findUnique({
    where: { id: renewalEventId },
    select: {
      id: true,
      status: true,
      periodStart: true,
      periodEnd: true,
      lineItem: { select: { id: true, nextDueAt: true, intervalMonths: true, billingKind: true } },
    },
  });

  if (!renewal) throw new Error('renewal-missing');
  if (renewal.status !== 'pending' && renewal.status !== 'drafted') {
    throw new Error('renewal-already-billed');
  }

  await tx.renewalEvent.update({
    where: { id: renewal.id },
    data: { status: 'invoiced', invoiceId },
  });

  // The anchor moves to the period after the one just billed, but only if it
  // is still pointing at that period — a later period already invoiced out of
  // order must not be pulled backwards.
  const line = renewal.lineItem;
  const months = line.intervalMonths ?? intervalFor(line.billingKind) ?? 0;
  if (months > 0 && line.nextDueAt?.getTime() === renewal.periodStart.getTime()) {
    await tx.lineItem.update({
      where: { id: line.id },
      data: { nextDueAt: renewal.periodEnd },
    });
  }
}

/** Human wording for a period, e.g. "Sept 2026 – Sept 2027". */
export function periodLabel(start: Date, end: Date): string {
  const format = (date: Date) =>
    new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
      date,
    );
  return `${format(start)} – ${format(end)}`;
}

export const RENEWAL_STATUS_LABEL: Record<string, string> = {
  pending: 'Not invoiced',
  drafted: 'Draft invoice raised',
  invoiced: 'Invoiced',
  paid: 'Paid',
  skipped: 'Skipped',
  cancelled: 'Cancelled',
};
