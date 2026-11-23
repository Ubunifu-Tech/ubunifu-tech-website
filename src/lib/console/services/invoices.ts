import 'server-only';
import { db } from '@/lib/db';
import { Prisma } from '@/generated/prisma/client';
import { recordAudit } from '@/lib/console/auth';
import { billableLines, nextInvoiceNumber, recomputeInvoice, type Billable } from '@/lib/console/billing';
import { retryOnConflict } from '@/lib/console/conflict';
import {
  daysFromToday,
  formatMoney,
  MONEY_CAP_MINOR,
  moneyCapText,
  numbers,
  overMoneyCap,
  parseMoney,
} from '@/lib/console/money';
import { getOrg } from '@/lib/console/org';
import { markRenewalInvoiced, periodLabel, RenewalAlreadyBilled } from '@/lib/console/renewals';

/**
 * Raising an invoice from a project's fees, in one place.
 *
 * The Money section of a project, the payment forms and the console assistant
 * all turn fee lines into an invoice, and an invoice is a demand for money, so
 * they must never disagree about what can be billed or what it comes to.
 * Everything here takes plain values. Reading a form, checking who is signed
 * in, refreshing pages and sending anything stay with the caller.
 */

/** Thrown inside the transaction when a fee was invoiced by someone else first. */
export class AlreadyBilled extends Error {}

export const BILLED_MEANWHILE =
  'Someone invoiced one of those fees a moment ago. Reload to see what is left.';

/**
 * Writes an invoice for fee lines, inside the caller's transaction.
 *
 * Shared by raising an invoice and by taking a payment that came before one,
 * so both guard against billing a fee twice the same way.
 */
export async function invoiceForBillables(
  tx: Prisma.TransactionClient,
  input: {
    project: { id: string; clientId: string };
    lines: Billable[];
    currency: string;
    notes: string;
    dueAt: Date | null;
    taxMinor: number;
    /** Set when the invoice is issued as it is made, rather than drafted. */
    issuedAt?: Date;
  },
): Promise<{ id: string; number: string }> {
  const { project, lines, notes, dueAt, taxMinor } = input;
  /**
   * Two people invoicing the same fee at the same moment must not both
   * succeed. The fee rows are locked for the length of this transaction and
   * what is still unbilled is read again under the lock: the second invoice
   * waits, sees the first, and stops. Renewal periods are guarded the same
   * way by markRenewalInvoiced below.
   */
  // A usage fee is billed again each time, so there is nothing to use up.
  const oneOff = lines.filter((line) => !line.renewalEventId && line.billingKind !== 'usage');
  // What was left of each one-off fee, read under the lock, before this invoice.
  const left = new Map<string, number>();
  if (oneOff.length > 0) {
    const ids = oneOff.map((line) => line.lineItemId);
    await tx.$queryRaw`SELECT id FROM "LineItem" WHERE id IN (${Prisma.join(ids)}) FOR UPDATE`;
    const current = numbers(await tx.lineItem.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        amountMinor: true,
        quantity: true,
        invoiceLines: {
          where: { invoice: { status: { not: 'void' } } },
          select: { amountMinor: true, quantity: true },
        },
      },
    }));
    for (const line of oneOff) {
      const fee = current.find((row) => row.id === line.lineItemId);
      const billed = (fee?.invoiceLines ?? []).reduce((t, l) => t + l.amountMinor * l.quantity, 0);
      const remaining = fee ? fee.amountMinor * fee.quantity - billed : 0;
      if (line.amountMinor > remaining) throw new AlreadyBilled();
      left.set(line.lineItemId, remaining);
    }
  }

  const number = await nextInvoiceNumber(tx);
  const created = numbers(await tx.invoice.create({
    data: {
      number,
      clientId: project.clientId,
      projectId: project.id,
      currency: input.currency,
      notes: notes || null,
      dueAt,
      taxMinor,
      ...(input.issuedAt ? { status: 'sent' as const, issuedAt: input.issuedAt } : {}),
      lines: {
        create: lines.map((line, index) => ({
          lineItemId: line.lineItemId,
          label: line.label,
          // A renewal says which period it covers, because "Hosting" on its
          // own tells a client nothing about which year they are paying for.
          description:
            line.periodStart && line.periodEnd
              ? `${periodLabel(line.periodStart, line.periodEnd)}${line.terms ? ` · ${line.terms}` : ''}`
              : partNote(line, left.get(line.lineItemId))
                ? `${partNote(line, left.get(line.lineItemId))}${line.terms ? ` · ${line.terms}` : ''}`
                : line.terms,
          amountMinor: line.amountMinor,
          quantity: 1,
          position: index,
        })),
      },
    },
    select: { id: true, number: true },
  }));

  // Marks each period invoiced and moves its line on to the next one. Throws
  // if a period was billed between the read above and here, which rolls the
  // whole invoice back rather than charging for it twice.
  for (const line of lines) {
    if (line.renewalEventId) {
      await markRenewalInvoiced(tx, line.renewalEventId, created.id);
    }
  }

  return created;
}

/**
 * What an invoice line says when it carries part of a one-off fee, so the
 * client can see it against the whole price: a part while more is still to
 * come, and the balance when this is the last of it.
 */
function partNote(line: Billable, remaining: number | undefined): string | null {
  if (line.fullMinor === undefined || remaining === undefined) return null;
  const whole = formatMoney(line.fullMinor, line.currency);
  if (line.amountMinor < remaining) return `Part of the ${whole} fee`;
  if (remaining < line.fullMinor) return `Balance of the ${whole} fee`;
  return null;
}

export type PickedBillables = {
  project: { id: string; slug: string; currency: string; clientId: string; name: string };
  lines: Billable[];
  currency: string;
  /** The VAT rate applied, in hundredths of a percent. 0 when none is charged. */
  vatRateBps: number;
  taxMinor: number;
  totalMinor: number;
};

/**
 * The fee lines somebody chose, checked against what is billable now, with the
 * VAT that goes on top. Re-derived from the database rather than trusted from
 * the caller: what was billable when the page rendered may have been invoiced
 * by somebody else since, and a renewal period is exactly the thing two people
 * can bill at once.
 *
 * `typed` gives this time's amount for a line, by its key, as it was typed: the
 * amount of a usage line, or a part of what is left of a one-off fee. Without
 * it a line keeps its own amount. A renewal period is never split.
 */
export async function pickBillables(
  projectId: string,
  chosen: string[],
  typed?: (key: string) => string | undefined,
): Promise<{ error: string } | PickedBillables> {
  const project = numbers(await db.project.findFirst({
    where: { id: projectId, deletedAt: null },
    select: { id: true, slug: true, currency: true, clientId: true, name: true },
  }));
  if (!project) return { error: 'That project no longer exists.' };

  const billable = await billableLines(project.id);
  const found = billable.filter((item) => chosen.includes(item.key));

  if (found.length !== chosen.length) {
    return {
      error:
        'One of those can no longer be billed. It may have been invoiced already. Reload and try again.',
    };
  }

  // A usage fee carries the amount typed for it this time, not its price. A
  // one-off fee can carry less than what is left of it: the first part now,
  // and the rest stays to be invoiced later.
  const lines: Billable[] = [];
  for (const line of found) {
    const raw = (typed?.(line.key) ?? '').trim();
    if (!line.usage) {
      if (!raw || line.renewalEventId) {
        lines.push(line);
        continue;
      }
      const part = parseMoney(raw, line.currency);
      if (!part || part <= 0) {
        return { error: `Enter an amount for ${line.label}, or untick it.` };
      }
      if (part > line.amountMinor) {
        return {
          error: `${line.label} has ${formatMoney(line.amountMinor, line.currency)} left to invoice. Enter that or less.`,
        };
      }
      lines.push({ ...line, amountMinor: part });
      continue;
    }
    if (!typed) {
      lines.push(line);
      continue;
    }
    const amountMinor = parseMoney(raw, line.currency);
    if (amountMinor === null && overMoneyCap(raw, line.currency)) {
      return {
        error: `Amounts above ${moneyCapText(line.currency)} cannot be entered. Raise ${line.label} as two invoices.`,
      };
    }
    if (!amountMinor || amountMinor <= 0) {
      return { error: `Enter this time's amount for ${line.label}.` };
    }
    lines.push({ ...line, amountMinor });
  }

  if (lines.some((line) => line.amountMinor === 0)) {
    return {
      error: 'One of those lines has no price. An invoice cannot carry a blank amount.',
    };
  }

  const currencies = [...new Set(lines.map((line) => line.currency))];
  if (currencies.length > 1) {
    return {
      error: `Those lines are in ${currencies.join(' and ')}. One invoice can only be in one currency.`,
    };
  }

  // VAT is added on top of the fees when the company charges it, at the rate
  // in the billing details at the moment the invoice is raised.
  const org = await getOrg();
  const subtotal = lines.reduce((total, line) => total + line.amountMinor, 0);
  const vatRateBps = org.chargesVat && org.vatRateBps > 0 ? org.vatRateBps : 0;
  const taxMinor = vatRateBps > 0 ? Math.round((subtotal * vatRateBps) / 10_000) : 0;
  if (
    lines.some((line) => line.amountMinor > MONEY_CAP_MINOR) ||
    subtotal + taxMinor > MONEY_CAP_MINOR
  ) {
    return {
      error: `One invoice cannot be more than ${moneyCapText(currencies[0]!)}. Untick some lines and raise a second invoice.`,
    };
  }

  return {
    project,
    lines,
    currency: currencies[0]!,
    vatRateBps,
    taxMinor,
    totalMinor: subtotal + taxMinor,
  };
}

/**
 * Due after the payment terms set in billing settings: calendar days from
 * today in Tanzania, stored at noon UTC like a typed date.
 */
export async function dueOnTerms(): Promise<Date> {
  const { paymentTermsDays } = await getOrg();
  return daysFromToday(paymentTermsDays);
}

/**
 * Saves a draft invoice for picked fee lines and records who raised it.
 *
 * A draft is not a demand yet: the client cannot see it and nothing is
 * emailed. It is issued only from its own page, by a person, after the checks
 * there. The lines are copied, not referenced. Re-pricing the project
 * afterwards must not silently rewrite a demand for money the client is
 * already holding, so the invoice keeps its own snapshot of what was charged
 * and why.
 */
export async function createDraftInvoice(input: {
  picked: PickedBillables;
  notes: string;
  dueAt: Date | null;
  staffId: string;
  /** Said on the activity record when the assistant drafted it for somebody. */
  viaAssistant?: boolean;
}): Promise<{ ok: true; invoice: { id: string; number: string } } | { ok: false; message: string }> {
  const { project, lines, currency, taxMinor } = input.picked;

  let invoice: { id: string; number: string };
  try {
    invoice = await retryOnConflict(() =>
      db.$transaction(async (tx) => {
        const created = await invoiceForBillables(tx, {
          project,
          lines,
          currency,
          notes: input.notes,
          dueAt: input.dueAt,
          taxMinor,
        });
        await recomputeInvoice(tx, created.id);
        return created;
      }),
    );
  } catch (error) {
    if (error instanceof AlreadyBilled || error instanceof RenewalAlreadyBilled) {
      return { ok: false, message: BILLED_MEANWHILE };
    }
    throw error;
  }

  await recordAudit({
    actorType: 'staff',
    actorId: input.staffId,
    action: 'invoice.created',
    entityType: 'Invoice',
    entityId: invoice.id,
    summary: `${invoice.number} for ${project.name}`,
    ...(input.viaAssistant ? { metadata: { viaAssistant: true } } : {}),
  });

  return { ok: true, invoice };
}

/**
 * A billable line as people and the assistant name it: the fee, and which
 * period when it is one period of a monthly or yearly fee.
 */
export function billableName(line: Pick<Billable, 'label' | 'periodStart' | 'periodEnd'>): string {
  return line.periodStart && line.periodEnd
    ? `${line.label}, ${periodLabel(line.periodStart, line.periodEnd)}`
    : line.label;
}
