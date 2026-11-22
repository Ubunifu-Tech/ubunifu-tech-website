import 'server-only';
import { db } from '@/lib/db';
import { BillingKind, LineItemStatus } from '@/generated/prisma/client';
import { recordAudit } from '@/lib/console/auth';
import { addMonths } from '@/lib/console/renewals';
import {
  formatMoney,
  MONEY_CAP_MINOR,
  moneyCapText,
  numbers,
  overMoneyCap,
  parseDateInput,
  parseMoney,
  todayInput,
} from '@/lib/console/money';
import { BILLING, isRecurring } from '@/lib/console/fee-labels';

/**
 * The rules for a fee, in one place.
 *
 * The fee form and the console assistant both add fees, and a fee is what a
 * client is invoiced from, so the two must never disagree about what a valid
 * one is. Everything here takes plain values: what somebody typed, whoever
 * typed it. Reading a form, checking who is signed in and refreshing pages
 * stay with the caller.
 */

export type FeeField = 'label' | 'billingKind' | 'amount' | 'quantity' | 'nextDueAt';

/** A fee as typed: every value still a string, as a form or a tool call gives it. */
export type FeeInput = {
  label: string;
  description?: string;
  billingKind: string;
  amount: string;
  quantity?: string;
  terms?: string;
  nextDueAt?: string;
  status?: string;
};

export type CheckedFee = {
  label: string;
  description: string | null;
  billingKind: BillingKind;
  amountMinor: number;
  quantity: number;
  terms: string | null;
  nextDueAt: Date | null;
  status: LineItemStatus | undefined;
};

export type FeeCheck =
  | { ok: true; fee: CheckedFee }
  | { ok: false; message: string; field: FeeField };

/** Checks a typed fee against the project's currency. Shared by add and edit. */
export function checkFee(input: FeeInput, currency: string): FeeCheck {
  const refuse = (message: string, field: FeeField): FeeCheck => ({ ok: false, message, field });

  const label = input.label.trim();
  if (label.length < 2 || label.length > 160) return refuse('Give the fee a name.', 'label');

  const kindRaw = input.billingKind.trim();
  if (!(Object.values(BillingKind) as string[]).includes(kindRaw)) {
    return refuse('Choose how it is billed.', 'billingKind');
  }
  const billingKind = kindRaw as BillingKind;

  const amountRaw = input.amount.trim();
  const amountMinor = amountRaw === '' ? 0 : parseMoney(amountRaw, currency);
  if (amountMinor === null && overMoneyCap(amountRaw, currency)) {
    return refuse(
      `Amounts above ${moneyCapText(currency)} cannot be entered. Split it into two fees.`,
      'amount',
    );
  }
  if (amountMinor === null || amountMinor < 0) {
    return refuse('Enter the price as a number, like 1500 or 1500.00.', 'amount');
  }

  const quantity = Number((input.quantity ?? '').trim() || '1');
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10_000) {
    return refuse('Quantity should be a whole number, 1 or more.', 'quantity');
  }
  if (amountMinor * quantity > MONEY_CAP_MINOR) {
    return refuse(
      `Together these come to more than ${moneyCapText(currency)}. Split it into two fees.`,
      'quantity',
    );
  }

  const dueRaw = (input.nextDueAt ?? '').trim();
  // A monthly or yearly fee is invoiced from its date, so it needs one.
  if (isRecurring(billingKind) && !dueRaw) {
    return refuse('Choose when the first payment is due.', 'nextDueAt');
  }
  const nextDueAt = isRecurring(billingKind) && dueRaw ? parseDateInput(dueRaw) : null;
  if (isRecurring(billingKind) && dueRaw && !nextDueAt) {
    return refuse('That date could not be read.', 'nextDueAt');
  }
  // A mistyped year would lay out years of periods to catch up on.
  if (nextDueAt && nextDueAt < addMonths(parseDateInput(todayInput())!, -60)) {
    return refuse(
      'That date is more than five years ago. Enter the next payment date instead.',
      'nextDueAt',
    );
  }

  const statusRaw = (input.status ?? '').trim();
  const status = (Object.values(LineItemStatus) as string[]).includes(statusRaw)
    ? (statusRaw as LineItemStatus)
    : undefined;

  return {
    ok: true,
    fee: {
      label,
      description: (input.description ?? '').trim().slice(0, 500) || null,
      billingKind,
      amountMinor,
      quantity,
      terms: (input.terms ?? '').trim().slice(0, 500) || null,
      nextDueAt,
      status,
    },
  };
}

/** Names compared the way a person reads them: case and spacing aside. */
function sameName(a: string, b: string): boolean {
  const tidy = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();
  return tidy(a) === tidy(b);
}

/**
 * Whether the project already has a fee with this name that still counts.
 *
 * Two fees called "Phase 2 deposit" on one project read as one fee entered
 * twice, on the proposal and on every invoice after it. A removed fee does not
 * count, so its name can be used again.
 */
export async function feeNameTaken(
  projectId: string,
  label: string,
  exceptId?: string,
): Promise<boolean> {
  const others = await db.lineItem.findMany({
    where: {
      projectId,
      status: { not: 'cancelled' },
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
    select: { label: true },
  });
  return others.some((other) => sameName(other.label, label));
}

export function duplicateFeeMessage(label: string): string {
  return `This project already has a fee called ${label}. Give this one its own name, such as the stage it pays for.`;
}

export function feeSummary(fee: CheckedFee, currency: string): string {
  return `${fee.label}: ${formatMoney(fee.amountMinor * fee.quantity, currency)} ${BILLING[fee.billingKind].label.toLowerCase()}`;
}

/** Adds a checked fee to a project and records who did. */
export async function createFee(input: {
  project: { id: string; currency: string };
  fee: CheckedFee;
  staffId: string;
  /** Said on the activity record when the assistant added it for somebody. */
  viaAssistant?: boolean;
}): Promise<{ id: string }> {
  const { project, fee } = input;
  const position = await db.lineItem.count({ where: { projectId: project.id } });

  const created = numbers(
    await db.lineItem.create({
      data: {
        projectId: project.id,
        label: fee.label,
        description: fee.description,
        billingKind: fee.billingKind,
        amountMinor: fee.amountMinor,
        quantity: fee.quantity,
        terms: fee.terms,
        currency: project.currency,
        position,
        status: fee.status ?? 'planned',
        ...(isRecurring(fee.billingKind)
          ? {
              nextDueAt: fee.nextDueAt,
              dueDay: fee.nextDueAt?.getUTCDate() ?? null,
              intervalMonths: fee.billingKind === 'recurring_monthly' ? 1 : 12,
            }
          : {}),
      },
      select: { id: true },
    }),
  );

  await recordAudit({
    actorType: 'staff',
    actorId: input.staffId,
    action: 'line_item.created',
    entityType: 'LineItem',
    entityId: created.id,
    summary: feeSummary(fee, project.currency),
    ...(input.viaAssistant ? { metadata: { viaAssistant: true } } : {}),
  });

  return created;
}

/**
 * Gives a fee a new name and nothing else. The price, the dates and how it is
 * billed are untouched, so this is safe on a fee that has been invoiced.
 */
export async function renameFee(input: {
  feeId: string;
  label: string;
  staffId: string;
}): Promise<{ ok: true; projectSlug: string } | { ok: false; message: string }> {
  const label = input.label.trim();
  if (label.length < 2 || label.length > 160) return { ok: false, message: 'Give the fee a name.' };

  const line = await db.lineItem.findUnique({
    where: { id: input.feeId },
    select: {
      id: true,
      label: true,
      project: { select: { id: true, slug: true, deletedAt: true } },
    },
  });
  if (!line || line.project.deletedAt) return { ok: false, message: 'That fee no longer exists.' };
  if (line.label === label) return { ok: true, projectSlug: line.project.slug };
  if (await feeNameTaken(line.project.id, label, line.id)) {
    return { ok: false, message: duplicateFeeMessage(label) };
  }

  await db.lineItem.update({ where: { id: line.id }, data: { label } });
  await recordAudit({
    actorType: 'staff',
    actorId: input.staffId,
    action: 'line_item.saved',
    entityType: 'LineItem',
    entityId: line.id,
    summary: `${label}: name ${line.label} to ${label}`,
    metadata: { changes: { name: [line.label, label] }, viaAssistant: true },
  });
  return { ok: true, projectSlug: line.project.slug };
}
