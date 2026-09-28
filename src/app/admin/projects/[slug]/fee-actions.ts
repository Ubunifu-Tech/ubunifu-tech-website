'use server';

import { NO_PERMISSION, STAFF_SIGNED_OUT } from '@/lib/console/permissions';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { BillingKind, LineItemStatus } from '@/generated/prisma/client';
import { can, requireStaff, recordAudit, staffForAction } from '@/lib/console/auth';
import { addMonths, dropOffSchedulePeriods } from '@/lib/console/renewals';
import {
  formatMoney,
  formatShortDate,
  MONEY_CAP_MINOR,
  moneyCapText,
  overMoneyCap,
  parseDateInput,
  parseMoney,
  toDateInputValue,
  todayInput,
} from '@/lib/console/money';
import { formText } from '@/lib/console/form';
import { BILLING, isRecurring } from '@/lib/console/fee-labels';

export type FeeState = {
  status: 'idle' | 'done' | 'error';
  message?: string;
  /** Which field the message is about, so the right step can be shown. */
  field?: 'label' | 'billingKind' | 'amount' | 'quantity' | 'nextDueAt';
  /** The session ended while the form was open; what was typed stays on screen. */
  signedOut?: boolean;
};

type Parsed = {
  label: string;
  description: string | null;
  billingKind: BillingKind;
  amountMinor: number;
  quantity: number;
  terms: string | null;
  nextDueAt: Date | null;
  status: LineItemStatus | undefined;
};

/** Reads and checks a fee from the form. Shared by add and edit. */
function parse(
  formData: FormData,
  currency: string,
): { ok: true; fee: Parsed } | { ok: false; error: FeeState } {
  const label = formText(formData, 'label');
  if (label.length < 2 || label.length > 160) {
    return {
      ok: false,
      error: {
        status: 'error',
        message: 'Give the fee a name.',
        field: 'label',
      },
    };
  }

  const kindRaw = formText(formData, 'billingKind');
  if (!(Object.values(BillingKind) as string[]).includes(kindRaw)) {
    return {
      ok: false,
      error: {
        status: 'error',
        message: 'Choose how it is billed.',
        field: 'billingKind',
      },
    };
  }
  const billingKind = kindRaw as BillingKind;

  const amountRaw = formText(formData, 'amount');
  const amountMinor = amountRaw === '' ? 0 : parseMoney(amountRaw, currency);
  if (amountMinor === null && overMoneyCap(amountRaw, currency)) {
    return {
      ok: false,
      error: {
        status: 'error',
        message: `Amounts above ${moneyCapText(currency)} cannot be entered. Split it into two fees.`,
        field: 'amount',
      },
    };
  }
  if (amountMinor === null || amountMinor < 0) {
    return {
      ok: false,
      error: {
        status: 'error',
        message: 'Enter the price as a number, like 1500 or 1500.00.',
        field: 'amount',
      },
    };
  }

  const quantity = Number(formText(formData, 'quantity') || '1');
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10_000) {
    return {
      ok: false,
      error: {
        status: 'error',
        message: 'Quantity should be a whole number, 1 or more.',
        field: 'quantity',
      },
    };
  }
  if (amountMinor * quantity > MONEY_CAP_MINOR) {
    return {
      ok: false,
      error: {
        status: 'error',
        message: `Together these come to more than ${moneyCapText(currency)}. Split it into two fees.`,
        field: 'quantity',
      },
    };
  }

  const dueRaw = formText(formData, 'nextDueAt');
  // A monthly or yearly fee is invoiced from its date, so it needs one.
  if (isRecurring(billingKind) && !dueRaw) {
    return {
      ok: false,
      error: {
        status: 'error',
        message: 'Choose when the first payment is due.',
        field: 'nextDueAt',
      },
    };
  }
  const nextDueAt = isRecurring(billingKind) && dueRaw ? parseDateInput(dueRaw) : null;
  if (isRecurring(billingKind) && dueRaw && !nextDueAt) {
    return {
      ok: false,
      error: {
        status: 'error',
        message: 'That date could not be read.',
        field: 'nextDueAt',
      },
    };
  }
  // A mistyped year would lay out years of periods to catch up on.
  if (nextDueAt && nextDueAt < addMonths(parseDateInput(todayInput())!, -60)) {
    return {
      ok: false,
      error: {
        status: 'error',
        message: 'That date is more than five years ago. Enter the next payment date instead.',
        field: 'nextDueAt',
      },
    };
  }

  const statusRaw = formText(formData, 'status');
  const status = (Object.values(LineItemStatus) as string[]).includes(statusRaw)
    ? (statusRaw as LineItemStatus)
    : undefined;

  return {
    ok: true,
    fee: {
      label,
      description: formText(formData, 'description').slice(0, 500) || null,
      billingKind,
      amountMinor,
      quantity,
      terms: formText(formData, 'terms').slice(0, 500) || null,
      nextDueAt,
      status,
    },
  };
}

function revalidate(slug: string) {
  revalidatePath(`/admin/projects/${slug}`);
  revalidatePath('/admin/projects');
  revalidatePath('/admin/documents', 'layout');
}

export async function addFee(_previous: FeeState, formData: FormData): Promise<FeeState> {
  const staff = await staffForAction();
  if (!staff) return { status: 'error', signedOut: true, message: STAFF_SIGNED_OUT };
  if (!can(staff, 'fees')) return { status: 'error', message: NO_PERMISSION };

  const project = await db.project.findFirst({
    where: { id: formText(formData, 'projectId'), deletedAt: null },
    select: {
      id: true,
      slug: true,
      currency: true,
      _count: { select: { lineItems: true } },
    },
  });
  if (!project) return { status: 'error', message: 'That project no longer exists.' };

  const read = parse(formData, project.currency);
  if (!read.ok) return read.error;
  const parsed = read.fee;

  const created = await db.lineItem.create({
    data: {
      projectId: project.id,
      label: parsed.label,
      description: parsed.description,
      billingKind: parsed.billingKind,
      amountMinor: parsed.amountMinor,
      quantity: parsed.quantity,
      terms: parsed.terms,
      currency: project.currency,
      position: project._count.lineItems,
      status: parsed.status ?? 'planned',
      ...(isRecurring(parsed.billingKind)
        ? {
            nextDueAt: parsed.nextDueAt,
            intervalMonths: parsed.billingKind === 'recurring_monthly' ? 1 : 12,
          }
        : {}),
    },
    select: { id: true },
  });

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'line_item.created',
    entityType: 'LineItem',
    entityId: created.id,
    summary: `${parsed.label}: ${formatMoney(parsed.amountMinor * parsed.quantity, project.currency)} ${BILLING[parsed.billingKind].label.toLowerCase()}`,
  });

  revalidate(project.slug);
  return { status: 'done', message: `${parsed.label} added.` };
}

export async function updateFee(_previous: FeeState, formData: FormData): Promise<FeeState> {
  const staff = await staffForAction();
  if (!staff) return { status: 'error', signedOut: true, message: STAFF_SIGNED_OUT };
  if (!can(staff, 'fees')) return { status: 'error', message: NO_PERMISSION };

  const line = await db.lineItem.findUnique({
    where: { id: formText(formData, 'lineItemId') },
    select: {
      id: true,
      label: true,
      description: true,
      billingKind: true,
      amountMinor: true,
      quantity: true,
      terms: true,
      status: true,
      currency: true,
      nextDueAt: true,
      _count: { select: { invoiceLines: true } },
      project: { select: { slug: true, deletedAt: true } },
      // The latest period already invoiced or skipped, if any.
      renewals: {
        where: { status: { not: 'pending' } },
        orderBy: { periodEnd: 'desc' },
        take: 1,
        select: { periodEnd: true },
      },
    },
  });
  if (!line || line.project.deletedAt)
    return { status: 'error', message: 'That fee no longer exists.' };

  const read = parse(formData, line.currency);
  if (!read.ok) return read.error;
  const parsed = read.fee;
  const handled = line.renewals;

  // Once a period is invoiced or skipped, a fee's billing type is part of what
  // the client was sent, and switching it would leave periods of the wrong length.
  if (
    (line._count.invoiceLines > 0 || handled.length > 0) &&
    parsed.billingKind !== line.billingKind
  ) {
    return {
      status: 'error',
      message:
        'Periods of this fee have been invoiced or skipped, so how it is billed cannot change. Add a new fee instead.',
      field: 'billingKind',
    };
  }

  // Moving the date back over periods already handled would offer them again.
  // Only a changed date is checked, so saving other details never trips this.
  const handledUntil = handled[0]?.periodEnd;
  if (
    isRecurring(parsed.billingKind) &&
    handledUntil &&
    parsed.nextDueAt &&
    parsed.nextDueAt.getTime() !== line.nextDueAt?.getTime() &&
    parsed.nextDueAt < handledUntil
  ) {
    const end = formatShortDate(handledUntil);
    return {
      status: 'error',
      message: `Periods up to ${end} are already invoiced or skipped. Choose ${end} or later.`,
      field: 'nextDueAt',
    };
  }

  await db.lineItem.update({
    where: { id: line.id },
    data: {
      label: parsed.label,
      description: parsed.description,
      billingKind: parsed.billingKind,
      amountMinor: parsed.amountMinor,
      quantity: parsed.quantity,
      terms: parsed.terms,
      ...(parsed.status ? { status: parsed.status } : {}),
      ...(isRecurring(parsed.billingKind)
        ? {
            nextDueAt: parsed.nextDueAt,
            intervalMonths: parsed.billingKind === 'recurring_monthly' ? 1 : 12,
          }
        : { nextDueAt: null, intervalMonths: null }),
    },
  });

  // A new date or a new way of billing is a new schedule: the old one's
  // unbilled periods would otherwise be offered alongside it.
  const nextDueAt = isRecurring(parsed.billingKind) ? parsed.nextDueAt : null;
  if (
    line.billingKind !== parsed.billingKind ||
    line.nextDueAt?.getTime() !== nextDueAt?.getTime()
  ) {
    await dropOffSchedulePeriods(line.id);
  }

  // Before and after for everything that changed: a price change is the thing
  // on a project a client is most likely to question later.
  const money = (minor: number) => formatMoney(minor, line.currency);
  const changes: Record<string, [string, string]> = {};
  if (line.label !== parsed.label) changes.name = [line.label, parsed.label];
  if (line.amountMinor !== parsed.amountMinor)
    changes.price = [money(line.amountMinor), money(parsed.amountMinor)];
  if (line.quantity !== parsed.quantity)
    changes.quantity = [String(line.quantity), String(parsed.quantity)];
  if (line.billingKind !== parsed.billingKind) {
    changes.billing = [BILLING[line.billingKind].label, BILLING[parsed.billingKind].label];
  }
  if ((line.terms ?? '') !== (parsed.terms ?? ''))
    changes.terms = [line.terms ?? 'none', parsed.terms ?? 'none'];
  if (parsed.status && parsed.status !== line.status) changes.status = [line.status, parsed.status];
  if (
    isRecurring(parsed.billingKind) &&
    line.nextDueAt?.getTime() !== parsed.nextDueAt?.getTime()
  ) {
    changes.renews = [
      line.nextDueAt ? toDateInputValue(line.nextDueAt) : 'not set',
      parsed.nextDueAt ? toDateInputValue(parsed.nextDueAt) : 'not set',
    ];
  }

  if (Object.keys(changes).length > 0) {
    await recordAudit({
      actorType: 'staff',
      actorId: staff.id,
      action: 'line_item.saved',
      entityType: 'LineItem',
      entityId: line.id,
      summary: `${parsed.label}: ${Object.entries(changes)
        .map(([field, [before, after]]) => `${field} ${before} to ${after}`)
        .join(', ')}`,
      metadata: { changes },
    });
  }

  revalidate(line.project.slug);
  return {
    status: 'done',
    message: Object.keys(changes).length > 0 ? 'Saved.' : 'Nothing changed.',
  };
}

/**
 * Removes a fee. One that was never invoiced, skipped or tied to a managed
 * service is deleted outright, with any periods merely laid out for it; one
 * with history is marked removed instead, because an invoice already sent
 * still points at it, and its unbilled periods go so none is left behind.
 */
export async function removeFee(_previous: FeeState, formData: FormData): Promise<FeeState> {
  const staff = await requireStaff();
  if (!can(staff, 'fees')) return { status: 'error', message: NO_PERMISSION };

  const line = await db.lineItem.findUnique({
    where: { id: formText(formData, 'lineItemId') },
    select: {
      id: true,
      label: true,
      _count: {
        select: {
          invoiceLines: true,
          // Periods invoiced or skipped. Pending ones were only laid out
          // ahead, by opening the Fees tab or Renewals, and are not history.
          renewals: { where: { status: { not: 'pending' } } },
        },
      },
      managedService: { select: { id: true } },
      project: { select: { slug: true, deletedAt: true } },
    },
  });
  if (!line || line.project.deletedAt)
    return { status: 'error', message: 'That fee no longer exists.' };

  const invoiced = line._count.invoiceLines > 0;
  const handled = line._count.renewals > 0;
  const managed = line.managedService !== null;
  const hasHistory = invoiced || handled || managed;

  if (hasHistory) {
    await db.$transaction([
      db.lineItem.update({
        where: { id: line.id },
        data: { status: 'cancelled' },
      }),
      db.renewalEvent.deleteMany({ where: { lineItemId: line.id, status: 'pending' } }),
    ]);
  } else {
    // Its pending periods go with it.
    await db.lineItem.delete({ where: { id: line.id } });
  }

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'line_item.removed',
    entityType: 'LineItem',
    entityId: line.id,
    summary: invoiced
      ? `${line.label} (kept in the history, it has been invoiced)`
      : handled
        ? `${line.label} (kept in the history, some periods were skipped)`
        : managed
          ? `${line.label} (kept, it bills a managed service)`
          : line.label,
  });

  revalidate(line.project.slug);
  return { status: 'done', message: `${line.label} removed.` };
}
