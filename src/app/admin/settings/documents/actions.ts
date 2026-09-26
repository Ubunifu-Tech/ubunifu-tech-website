'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { DocumentKind } from '@/generated/prisma/client';
import { can, recordAudit, requireStaff } from '@/lib/console/auth';
import { DOCUMENT_KIND_LABEL } from '@/lib/console/documents';
import { formTextExact } from '@/lib/console/form';
import { NO_PERMISSION } from '@/lib/console/permissions';

export type DefaultsState = { status: 'idle' | 'done' | 'error'; message?: string };

/**
 * Saves the standard sections for one kind of document. Anything already
 * sent keeps the sections it went out with; these apply from the next send.
 */
export async function saveDocumentDefault(
  _previous: DefaultsState,
  formData: FormData,
): Promise<DefaultsState> {
  const staff = await requireStaff();
  if (!can(staff, 'documents')) return { status: 'error', message: NO_PERMISSION };

  const kind = String(formData.get('kind') ?? '');
  if (!Object.values(DocumentKind).includes(kind as DocumentKind)) {
    return { status: 'error', message: 'That is not a kind of document.' };
  }
  const bodyMarkdown = formTextExact(formData, 'body').trim();
  if (bodyMarkdown.length > 20_000) {
    return { status: 'error', message: 'That is longer than a standard section should be.' };
  }
  if (/\{\{\s*(fees|standard)\s*\}\}/.test(bodyMarkdown)) {
    return { status: 'error', message: 'Take out the {{…}} placeholders; they belong in documents.' };
  }

  await db.documentDefault.upsert({
    where: { kind: kind as DocumentKind },
    create: { kind: kind as DocumentKind, bodyMarkdown, updatedById: staff.id },
    update: { bodyMarkdown, updatedById: staff.id },
  });
  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'document_defaults.saved',
    entityType: 'DocumentDefault',
    entityId: kind,
    summary: `${DOCUMENT_KIND_LABEL[kind as DocumentKind]}: ${
      bodyMarkdown ? `${bodyMarkdown.length} characters` : 'cleared'
    }`,
  });

  revalidatePath('/admin/settings/documents');
  revalidatePath('/admin/documents', 'layout');
  return {
    status: 'done',
    message: bodyMarkdown ? 'Saved. It goes on every one sent from now.' : 'Cleared.',
  };
}
