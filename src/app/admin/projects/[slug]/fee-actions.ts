'use server';

import { NO_PERMISSION } from '@/lib/console/permissions';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { BillingKind, LineItemStatus } from '@/generated/prisma/client';
import { can, requireStaff, recordAudit } from '@/lib/console/auth';
import { formatMoney, parseDateInput, parseMoney, toDateInputValue } from '@/lib/console/money';
import { formText } from '@/lib/console/form';
import { BILLING, isRecurring } from '@/lib/console/fee-labels';

export type FeeState = {
  status: 'idle' | 'done' | 'error';
  message?: string;
  /** Which field the message is about, so the right step can be shown. */
  field?: 'label' | 'billingKind' | 'amount' | 'quantity' | 'nextDueAt';
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

  const dueRaw = formText(formData, 'nextDueAt');
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
  const staff = await requireStaff();
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
  const staff = await requireStaff();
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
    },
  });
  if (!line || line.project.deletedAt)
    return { status: 'error', message: 'That fee no longer exists.' };

  const read = parse(formData, line.currency);
  if (!read.ok) return read.error;
  const parsed = read.fee;

  // Once invoiced, a fee's billing type is part of what the client was sent.
  if (line._count.invoiceLines > 0 && parsed.billingKind !== line.billingKind) {
    return {
      status: 'error',
      message:
        'This fee has been invoiced, so how it is billed cannot change. Add a new fee instead.',
      field: 'billingKind',
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
 * Removes a fee. One that was never invoiced or renewed is deleted outright;
 * one with history is marked removed instead, because an invoice already sent
 * still points at it.
 */
export async function removeFee(_previous: FeeState, formData: FormData): Promise<FeeState> {
  const staff = await requireStaff();
  if (!can(staff, 'fees')) return { status: 'error', message: NO_PERMISSION };

  const line = await db.lineItem.findUnique({
    where: { id: formText(formData, 'lineItemId') },
    select: {
      id: true,
      label: true,
      _count: { select: { invoiceLines: true, renewals: true } },
      managedService: { select: { id: true } },
      project: { select: { slug: true, deletedAt: true } },
    },
  });
  if (!line || line.project.deletedAt)
    return { status: 'error', message: 'That fee no longer exists.' };

  const hasHistory =
    line._count.invoiceLines > 0 || line._count.renewals > 0 || line.managedService !== null;

  if (hasHistory) {
    await db.lineItem.update({
      where: { id: line.id },
      data: { status: 'cancelled' },
    });
  } else {
    await db.lineItem.delete({ where: { id: line.id } });
  }

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'line_item.removed',
    entityType: 'LineItem',
    entityId: line.id,
    summary: hasHistory ? `${line.label} (kept in the history, it has been invoiced)` : line.label,
  });

  revalidate(line.project.slug);
  return { status: 'done', message: `${line.label} removed.` };
}
