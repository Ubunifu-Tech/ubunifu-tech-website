'use server';

import { NO_PERMISSION, STAFF_SIGNED_OUT } from '@/lib/console/permissions';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { can, requireStaff, recordAudit, staffForAction } from '@/lib/console/auth';
import { dropOffSchedulePeriods } from '@/lib/console/renewals';
import {
  formatMoney,
  formatShortDate,
  numbers,
  toDateInputValue,
} from '@/lib/console/money';
import { formText } from '@/lib/console/form';
import { BILLING, isRecurring } from '@/lib/console/fee-labels';
import {
  checkFee,
  createFee,
  duplicateFeeMessage,
  feeNameTaken,
  type CheckedFee,
} from '@/lib/console/services/fees';

export type FeeState = {
  status: 'idle' | 'done' | 'error';
  message?: string;
  /** Which field the message is about, so the right step can be shown. */
  field?: 'label' | 'billingKind' | 'amount' | 'quantity' | 'nextDueAt';
  /** The session ended while the form was open; what was typed stays on screen. */
  signedOut?: boolean;
};

/** Reads a fee from the form and checks it with the shared rules. */
function parse(
  formData: FormData,
  currency: string,
): { ok: true; fee: CheckedFee } | { ok: false; error: FeeState } {
  const checked = checkFee(
    {
      label: formText(formData, 'label'),
      description: formText(formData, 'description'),
      billingKind: formText(formData, 'billingKind'),
      amount: formText(formData, 'amount'),
      quantity: formText(formData, 'quantity'),
      terms: formText(formData, 'terms'),
      nextDueAt: formText(formData, 'nextDueAt'),
      status: formText(formData, 'status'),
    },
    currency,
  );
  if (checked.ok) return checked;
  return { ok: false, error: { status: 'error', message: checked.message, field: checked.field } };
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

  const project = numbers(await db.project.findFirst({
    where: { id: formText(formData, 'projectId'), deletedAt: null },
    select: {
      id: true,
      slug: true,
      currency: true,
    },
  }));
  if (!project) return { status: 'error', message: 'That project no longer exists.' };

  const read = parse(formData, project.currency);
  if (!read.ok) return read.error;
  const parsed = read.fee;

  if (await feeNameTaken(project.id, parsed.label)) {
    return { status: 'error', message: duplicateFeeMessage(parsed.label), field: 'label' };
  }

  await createFee({ project, fee: parsed, staffId: staff.id });

  revalidate(project.slug);
  return { status: 'done', message: `${parsed.label} added.` };
}

export async function updateFee(_previous: FeeState, formData: FormData): Promise<FeeState> {
  const staff = await staffForAction();
  if (!staff) return { status: 'error', signedOut: true, message: STAFF_SIGNED_OUT };
  if (!can(staff, 'fees')) return { status: 'error', message: NO_PERMISSION };

  const line = numbers(await db.lineItem.findUnique({
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
      dueDay: true,
      _count: { select: { invoiceLines: true } },
      project: { select: { id: true, slug: true, deletedAt: true } },
      // The latest period already invoiced or skipped, if any.
      renewals: {
        where: { status: { not: 'pending' } },
        orderBy: { periodEnd: 'desc' },
        take: 1,
        select: { periodEnd: true },
      },
    },
  }));
  if (!line || line.project.deletedAt)
    return { status: 'error', message: 'That fee no longer exists.' };

  const read = parse(formData, line.currency);
  if (!read.ok) return read.error;
  const parsed = read.fee;
  const handled = line.renewals;

  // Only a changed name is checked, so a project that already has two fees
  // with one name can still have their other details saved.
  if (parsed.label !== line.label && (await feeNameTaken(line.project.id, parsed.label, line.id))) {
    return { status: 'error', message: duplicateFeeMessage(parsed.label), field: 'label' };
  }

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

  numbers(await db.lineItem.update({
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
            // A date carried over unchanged may be a short month's stand-in
            // for a later day, so only a newly chosen date sets the day.
            ...(parsed.nextDueAt?.getTime() !== line.nextDueAt?.getTime() || line.dueDay === null
              ? { dueDay: parsed.nextDueAt?.getUTCDate() ?? null }
              : {}),
            intervalMonths: parsed.billingKind === 'recurring_monthly' ? 1 : 12,
          }
        : { nextDueAt: null, dueDay: null, intervalMonths: null }),
    },
  }));

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

  const line = numbers(await db.lineItem.findUnique({
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
  }));
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
