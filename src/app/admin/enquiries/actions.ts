'use server';

import { NO_PERMISSION } from '@/lib/console/permissions';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { EnquiryStatus, ServiceLine } from '@/generated/prisma/client';
import { can, requireStaff, recordAudit } from '@/lib/console/auth';
import { formText } from '@/lib/console/form';
import { liveEnquiry } from '@/lib/console/live';

export type TriageState = { status: 'idle' | 'done' | 'error'; message?: string };

/**
 * Triage, which is the only thing that happens to an enquiry before it either
 * becomes a client or stops being interesting.
 *
 * `converted` is not in this list. A conversion is a side effect of creating
 * the client, never a label somebody sets by hand — otherwise the record could
 * claim an enquiry became a client that does not exist.
 */
const SETTABLE: EnquiryStatus[] = [
  EnquiryStatus.new,
  EnquiryStatus.triaged,
  EnquiryStatus.in_conversation,
  EnquiryStatus.qualified,
  EnquiryStatus.declined,
  EnquiryStatus.spam,
];

export async function setEnquiryStatus(
  _previous: TriageState,
  formData: FormData,
): Promise<TriageState> {
  // Inside the action, not inherited from the page: a server action is a
  // public endpoint and the form having been rendered proves nothing.
  const staff = await requireStaff();
  if (!can(staff, 'enquiries')) return { status: 'error', message: NO_PERMISSION };

  const id = String(formData.get('id') ?? '');
  const next = String(formData.get('status') ?? '');

  if (!(SETTABLE as string[]).includes(next)) {
    return { status: 'error', message: 'That is not a status an enquiry can be moved to.' };
  }

  const enquiry = await db.enquiry.findFirst({
    where: { id, ...liveEnquiry },
    select: { id: true, status: true, name: true },
  });

  if (!enquiry) {
    return { status: 'error', message: 'That enquiry no longer exists.' };
  }

  if (enquiry.status === 'converted') {
    return {
      status: 'error',
      message: 'This enquiry is already a client. Its history stays as it is.',
    };
  }

  await db.enquiry.update({
    where: { id },
    data: { status: next as EnquiryStatus },
  });

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'enquiry.status_changed',
    entityType: 'Enquiry',
    entityId: id,
    summary: `${enquiry.status} → ${next}`,
  });

  revalidatePath('/admin/enquiries');
  return { status: 'done' };
}

export async function saveEnquiryNote(
  _previous: TriageState,
  formData: FormData,
): Promise<TriageState> {
  const staff = await requireStaff();
  if (!can(staff, 'enquiries')) return { status: 'error', message: NO_PERMISSION };

  const id = String(formData.get('id') ?? '');
  const note = formText(formData, 'internalNote');

  if (note.length > 2000) {
    return { status: 'error', message: 'That note is too long.' };
  }

  const enquiry = await db.enquiry.findFirst({ where: { id, ...liveEnquiry }, select: { id: true } });
  if (!enquiry) return { status: 'error', message: 'That enquiry no longer exists.' };

  await db.enquiry.update({
    where: { id },
    data: { internalNote: note || null },
  });

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'enquiry.note_saved',
    entityType: 'Enquiry',
    entityId: id,
  });

  revalidatePath('/admin/enquiries');
  return { status: 'done', message: 'Saved.' };
}

/**
 * Takes an enquiry out of the console: test messages, duplicates, anything
 * nobody should have to scroll past again. The row stays, so the record of who
 * wrote in and when is still there for the activity history; every list and
 * count leaves it out.
 */
export async function removeEnquiry(
  _previous: TriageState,
  formData: FormData,
): Promise<TriageState> {
  const staff = await requireStaff();
  if (!can(staff, 'enquiries')) return { status: 'error', message: NO_PERMISSION };

  const id = formText(formData, 'id');
  const enquiry = await db.enquiry.findFirst({
    where: { id, ...liveEnquiry },
    select: { id: true, name: true, subject: true },
  });
  if (!enquiry) return { status: 'error', message: 'That enquiry no longer exists.' };

  // Conditional, so a second press from another tab records nothing twice.
  const removed = await db.enquiry.updateMany({
    where: { id: enquiry.id, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  if (removed.count === 0) return { status: 'error', message: 'That enquiry no longer exists.' };

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'enquiry.removed',
    entityType: 'Enquiry',
    entityId: enquiry.id,
    summary: `${enquiry.name}, about ${enquiry.subject}`,
  });

  // The list, and the unread counts on the overview and in the sidebar.
  revalidatePath('/admin', 'layout');
  return { status: 'done', message: 'Removed.' };
}

/**
 * Opens a converted enquiry again when the client it became has been
 * removed, so it can be onboarded properly this time. The history keeps who
 * it was before.
 */
export async function reopenEnquiry(
  _previous: TriageState,
  formData: FormData,
): Promise<TriageState> {
  const staff = await requireStaff();
  if (!can(staff, 'enquiries')) return { status: 'error', message: NO_PERMISSION };

  const enquiry = await db.enquiry.findFirst({
    where: { id: formText(formData, 'id'), ...liveEnquiry },
    select: { id: true, status: true, client: { select: { name: true, deletedAt: true } } },
  });
  if (!enquiry) return { status: 'error', message: 'That enquiry no longer exists.' };
  if (enquiry.status !== 'converted' || (enquiry.client && !enquiry.client.deletedAt)) {
    return { status: 'error', message: 'It is still with a client, so it stays as it is.' };
  }

  const reopened = await db.enquiry.updateMany({
    where: { id: enquiry.id, status: 'converted' },
    data: { status: 'qualified', clientId: null, projectId: null },
  });
  if (reopened.count === 0) return { status: 'error', message: 'It changed a moment ago. Reload.' };

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'enquiry.reopened',
    entityType: 'Enquiry',
    entityId: enquiry.id,
    summary: enquiry.client ? `Was ${enquiry.client.name}, since removed` : undefined,
  });
  revalidatePath('/admin/enquiries');
  return { status: 'done', message: 'Open again.' };
}

/** Brings back an enquiry that was removed, with its note and history. */
export async function restoreEnquiry(
  _previous: TriageState,
  formData: FormData,
): Promise<TriageState> {
  const staff = await requireStaff();
  if (!can(staff, 'enquiries')) return { status: 'error', message: NO_PERMISSION };

  const enquiry = await db.enquiry.findFirst({
    where: { id: formText(formData, 'id'), deletedAt: { not: null } },
    select: { id: true, name: true, subject: true },
  });
  if (!enquiry) return { status: 'error', message: 'It is not removed any more.' };

  await db.enquiry.updateMany({ where: { id: enquiry.id }, data: { deletedAt: null } });
  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'enquiry.restored',
    entityType: 'Enquiry',
    entityId: enquiry.id,
    summary: `${enquiry.name}, about ${enquiry.subject}`,
  });
  revalidatePath('/admin', 'layout');
  return { status: 'done', message: 'Brought back.' };
}

/** What the enquiry is about, which the new client or project form starts from. */
export async function setEnquiryServiceLine(
  _previous: TriageState,
  formData: FormData,
): Promise<TriageState> {
  const staff = await requireStaff();
  if (!can(staff, 'enquiries')) return { status: 'error', message: NO_PERMISSION };

  const serviceLine = formText(formData, 'serviceLine');
  if (!(Object.values(ServiceLine) as string[]).includes(serviceLine)) {
    return { status: 'error', message: 'Choose what the work is.' };
  }
  const enquiry = await db.enquiry.findFirst({
    where: { id: formText(formData, 'id'), ...liveEnquiry },
    select: { id: true },
  });
  if (!enquiry) return { status: 'error', message: 'That enquiry no longer exists.' };

  await db.enquiry.update({
    where: { id: enquiry.id },
    data: { serviceLine: serviceLine as ServiceLine },
  });
  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'enquiry.service_line_set',
    entityType: 'Enquiry',
    entityId: enquiry.id,
    summary: serviceLine,
  });
  revalidatePath('/admin/enquiries');
  return { status: 'done', message: 'Saved.' };
}
