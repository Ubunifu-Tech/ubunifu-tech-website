'use server';

import { NO_PERMISSION } from '@/lib/console/permissions';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { EnquiryStatus } from '@/generated/prisma/client';
import { can, requireStaff, recordAudit } from '@/lib/console/auth';
import { formText } from '@/lib/console/form';

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

  const enquiry = await db.enquiry.findUnique({
    where: { id },
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

  const enquiry = await db.enquiry.findUnique({ where: { id }, select: { id: true } });
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
