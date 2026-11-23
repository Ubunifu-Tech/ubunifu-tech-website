'use server';

import { revalidatePath } from 'next/cache';
import { can, requireStaff } from '@/lib/console/auth';
import { formText } from '@/lib/console/form';
import { NO_PERMISSION } from '@/lib/console/permissions';
import { recordOverdueNotice } from '@/lib/console/services/hosting';
import { db } from '@/lib/db';

export type NoticeState = { status: 'idle' | 'done' | 'error'; message?: string };

/**
 * Records that the client was told an invoice is overdue. Nothing is sent
 * from here: somebody told them, and this is where that is written down.
 */
export async function recordNotice(_previous: NoticeState, formData: FormData): Promise<NoticeState> {
  const staff = await requireStaff();
  if (!can(staff, 'invoices')) return { status: 'error', message: NO_PERMISSION };

  const invoiceId = formText(formData, 'invoiceId');
  const recorded = await recordOverdueNotice({
    staffId: staff.id,
    invoiceId,
    givenAt: formText(formData, 'givenAt'),
    channel: formText(formData, 'channel'),
    note: formText(formData, 'note'),
  });
  if (!recorded.ok) return { status: 'error', message: recorded.message };

  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    select: { number: true, project: { select: { slug: true } } },
  });
  if (invoice) revalidatePath(`/admin/invoices/${invoice.number}`);
  // The project's Hosting section reads the same record.
  if (invoice?.project) revalidatePath(`/admin/projects/${invoice.project.slug}`);
  return { status: 'done', message: recorded.message };
}
