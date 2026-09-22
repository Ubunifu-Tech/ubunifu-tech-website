'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireClient, recordAudit } from '@/lib/console/auth';
import { recordAssetUpload } from '@/lib/console/uploads';

export type UploadState = { status: 'idle' | 'done' | 'error'; message?: string };

/**
 * Records an upload the browser has just finished.
 *
 * The store's own completion callback cannot reach a laptop, and even in
 * production it arrives a moment later — so the browser tells us as soon as
 * the bytes are up and the page can show the file straight away. What it sends
 * is a URL, not a size or a type: recordAssetUpload asks the store itself for
 * those, so nothing here depends on the browser being honest about the file.
 *
 * Ownership is re-checked. The token that allowed the upload was scoped, but a
 * server action is a public endpoint and is never allowed to assume the last
 * one ran.
 */
export async function confirmUpload(
  _previous: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const actor = await requireClient();

  const blobUrl = String(formData.get('blobUrl') ?? '');
  const assetRequestId = String(formData.get('assetRequestId') ?? '');
  const filename = String(formData.get('filename') ?? 'file');

  const assetRequest = await db.assetRequest.findFirst({
    where: { id: assetRequestId, project: { clientId: actor.clientId, deletedAt: null } },
    select: { id: true, title: true, project: { select: { id: true, slug: true } } },
  });
  if (!assetRequest) return { status: 'error', message: 'That is not something we asked you for.' };

  try {
    const { created } = await recordAssetUpload({
      blobUrl,
      assetRequestId: assetRequest.id,
      actor: { type: 'client_contact', id: actor.id },
      filename,
    });

    if (created) {
      await recordAudit({
        actorType: 'client_contact',
        actorId: actor.id,
        action: 'asset.uploaded',
        entityType: 'AssetRequest',
        entityId: assetRequest.id,
        summary: `${filename} sent for "${assetRequest.title}"`,
      });
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'upload-too-large') {
      return { status: 'error', message: 'That file is larger than we can take here.' };
    }
    // A URL the store does not know about, most often — the upload did not
    // finish, whatever the browser thinks.
    console.error('[uploads] could not record', error);
    return { status: 'error', message: 'That did not arrive. Try it again?' };
  }

  revalidatePath(`/portal/projects/${assetRequest.project.slug}`);
  revalidatePath(`/admin/projects/${assetRequest.project.slug}`);
  return { status: 'done', message: 'Got it, thank you.' };
}
