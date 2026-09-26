'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { can, recordAudit, requireStaff } from '@/lib/console/auth';
import { NO_PERMISSION } from '@/lib/console/permissions';
import { formText } from '@/lib/console/form';
import { markRenewalSkipped, periodLabel } from '@/lib/console/renewals';

export type RenewalState = { status: 'idle' | 'done' | 'error'; message?: string };

/**
 * A period that will not be billed: covered some other way, given free, or
 * not renewed this time. It leaves the list of things to invoice and the fee
 * moves on to the next period.
 */
export async function skipRenewal(
  _previous: RenewalState,
  formData: FormData,
): Promise<RenewalState> {
  const staff = await requireStaff();
  if (!can(staff, 'invoices')) return { status: 'error', message: NO_PERMISSION };

  const renewal = await db.renewalEvent.findUnique({
    where: { id: formText(formData, 'renewalId') },
    select: {
      id: true,
      periodStart: true,
      periodEnd: true,
      lineItem: { select: { id: true, label: true, project: { select: { slug: true } } } },
    },
  });
  if (!renewal) return { status: 'error', message: 'That period no longer exists.' };

  const skipped = await db.$transaction((tx) => markRenewalSkipped(tx, renewal.id));
  if (!skipped) {
    return { status: 'error', message: 'It was invoiced or skipped a moment ago. Reload to see it.' };
  }

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'renewal.skipped',
    entityType: 'LineItem',
    entityId: renewal.lineItem.id,
    summary: `${renewal.lineItem.label}, ${periodLabel(renewal.periodStart, renewal.periodEnd)}`,
  });

  revalidatePath('/admin/renewals');
  revalidatePath(`/admin/projects/${renewal.lineItem.project.slug}`);
  return { status: 'done', message: 'Skipped.' };
}

/** Undoes a skip made by mistake: the period is waiting to be invoiced again. */
export async function bringBackRenewal(
  _previous: RenewalState,
  formData: FormData,
): Promise<RenewalState> {
  const staff = await requireStaff();
  if (!can(staff, 'invoices')) return { status: 'error', message: NO_PERMISSION };

  const renewal = await db.renewalEvent.findUnique({
    where: { id: formText(formData, 'renewalId') },
    select: {
      id: true,
      periodStart: true,
      periodEnd: true,
      lineItem: {
        select: { id: true, label: true, nextDueAt: true, project: { select: { slug: true } } },
      },
    },
  });
  if (!renewal) return { status: 'error', message: 'That period no longer exists.' };

  const back = await db.$transaction(async (tx) => {
    const restored = await tx.renewalEvent.updateMany({
      where: { id: renewal.id, status: 'skipped' },
      data: { status: 'pending' },
    });
    if (restored.count !== 1) return false;
    // The fee points at the earliest period not yet billed, which is this
    // one again if it came before where the fee had moved on to.
    const next = renewal.lineItem.nextDueAt;
    if (!next || next.getTime() > renewal.periodStart.getTime()) {
      await tx.lineItem.update({
        where: { id: renewal.lineItem.id },
        data: { nextDueAt: renewal.periodStart },
      });
    }
    return true;
  });
  if (!back) return { status: 'error', message: 'It is not skipped any more. Reload to see it.' };

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'renewal.brought_back',
    entityType: 'LineItem',
    entityId: renewal.lineItem.id,
    summary: `${renewal.lineItem.label}, ${periodLabel(renewal.periodStart, renewal.periodEnd)}`,
  });

  revalidatePath('/admin/renewals');
  revalidatePath(`/admin/projects/${renewal.lineItem.project.slug}`);
  return { status: 'done', message: 'Brought back.' };
}
