'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { NO_PERMISSION } from '@/lib/console/permissions';
import { can, recordAudit, requireStaff } from '@/lib/console/auth';
import { formText } from '@/lib/console/form';
import { namesMatch, type RemovalState } from '@/lib/console/confirm-name';
import {
  projectRemovalCounts,
  withdrawOpenSignatures,
  type RemovalCounts,
} from '@/lib/console/removal';

/**
 * What removing a project will touch, looked up when somebody first presses
 * Remove. A server action rather than a prop so the control can be placed on
 * the project page with nothing but the project's id and name.
 */
export async function describeProjectRemoval(projectId: string): Promise<RemovalCounts | null> {
  const staff = await requireStaff();
  if (!can(staff, 'projects')) return null;

  const project = await db.project.findFirst({
    where: { id: String(projectId), deletedAt: null },
    select: { id: true },
  });
  if (!project) return null;
  return projectRemovalCounts(project.id);
}

/**
 * Removes one project. Its tasks, fees, invoices, documents and requests stay
 * as they are and go out of sight with it; anything out for signature is
 * withdrawn first, in the same transaction, so the client cannot sign for
 * work that is no longer on the books.
 */
export async function removeProject(
  _previous: RemovalState,
  formData: FormData,
): Promise<RemovalState> {
  const staff = await requireStaff();
  if (!can(staff, 'projects')) return { status: 'error', message: NO_PERMISSION };

  const project = await db.project.findFirst({
    where: { id: formText(formData, 'projectId'), deletedAt: null },
    select: { id: true, name: true, reference: true },
  });
  if (!project) return { status: 'error', message: 'That project no longer exists.' };
  if (!namesMatch(formText(formData, 'confirmName'), project.name)) {
    return { status: 'error', message: `Type ${project.name} to confirm.` };
  }

  const withdrawn = await db.$transaction(async (tx) => {
    // Conditional, so two people removing it at once cannot both record it.
    const claimed = await tx.project.updateMany({
      where: { id: project.id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (claimed.count === 0) return null;
    return withdrawOpenSignatures(tx, [project.id]);
  });

  if (!withdrawn) return { status: 'error', message: 'That project no longer exists.' };

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'project.removed',
    entityType: 'Project',
    entityId: project.id,
    summary:
      withdrawn.length > 0
        ? `${project.reference} ${project.name}; ${withdrawn.length} ${
            withdrawn.length === 1 ? 'document' : 'documents'
          } withdrawn`
        : `${project.reference} ${project.name}`,
    metadata: { withdrawnDocumentIds: withdrawn.map((document) => document.id) },
  });
  for (const document of withdrawn) {
    await recordAudit({
      actorType: 'staff',
      actorId: staff.id,
      action: 'document.withdrawn',
      entityType: 'Document',
      entityId: document.id,
      summary: `${document.reference}, because ${project.name} was removed`,
    });
  }

  // The board, every list and count, the client's page, and their portal.
  revalidatePath('/admin', 'layout');
  revalidatePath('/portal', 'layout');
  redirect('/projects');
}
