'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { getClientActor, requireClient, recordAudit } from '@/lib/console/auth';
import { recordAssetUpload, removeAssetUpload } from '@/lib/console/uploads';
import { alertClientSent } from '@/lib/console/alerts';

export type UploadState = { status: 'idle' | 'done' | 'error'; message?: string };

/** Whether the person is still signed in, to explain an upload that failed. */
export async function stillSignedIn(): Promise<boolean> {
  const actor = await getClientActor();
  return actor?.isActivated === true;
}

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
    // Audited inside, by whichever of this and the store's webhook creates
    // the row — so the line exists whoever wins.
    await recordAssetUpload({
      blobUrl,
      assetRequestId: assetRequest.id,
      actor: { type: 'client_contact', id: actor.id },
      filename,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'upload-too-large') {
      return { status: 'error', message: 'That file is larger than we can take here.' };
    }
    console.error('[uploads] could not record', error);
    // The row may be there even so: a step after it (the checklist or the
    // audit line) failed. Then the file is safe, and asking the client to
    // send it again would only make a second copy.
    const recorded = await db.fileUpload
      .findFirst({
        where: { storageKey: blobUrl, assetRequestId: assetRequest.id, deletedAt: null },
        select: { id: true },
      })
      .catch(() => null);
    if (recorded) {
      revalidatePath(`/portal/projects/${assetRequest.project.slug}`);
      revalidatePath(`/admin/projects/${assetRequest.project.slug}`);
      return { status: 'done', message: 'Got it, thank you.' };
    }
    // Only when the store says it has no such file, or it is not under this
    // item, did the upload really not arrive.
    const reason = error instanceof Error ? error.message : '';
    if (reason === 'upload-missing' || reason === 'upload-not-ours') {
      return { status: 'error', message: 'That did not arrive. Try it again?' };
    }
    return {
      status: 'error',
      message: 'We could not check that one. Refresh the page before sending it again.',
    };
  }

  revalidatePath(`/portal/projects/${assetRequest.project.slug}`);
  revalidatePath(`/admin/projects/${assetRequest.project.slug}`);
  return { status: 'done', message: 'Got it, thank you.' };
}

/**
 * Takes back a file sent by mistake. Any signed-in person at the client may,
 * not only whoever sent it: they share the checklist, and the wrong file is
 * the client's to withdraw. Scoped to their own client inside the lookup.
 */
export async function removeMyFile(_previous: UploadState, formData: FormData): Promise<UploadState> {
  const actor = await requireClient();
  const removed = await removeAssetUpload({
    fileId: String(formData.get('fileId') ?? ''),
    actor: { type: 'client_contact', id: actor.id },
    clientId: actor.clientId,
  });
  if (!removed) return { status: 'error', message: 'That file is already gone.' };

  revalidatePath(`/portal/projects/${removed.slug}`);
  revalidatePath(`/admin/projects/${removed.slug}`);
  return { status: 'done' };
}

export type AssignItemState = { status: 'idle' | 'done' | 'error'; message?: string };

/**
 * Who on the client's side is sending an item. Both the item and the person
 * are looked up inside the signed-in contact's own client, so a posted id
 * from anywhere else matches nothing.
 */
export async function assignMyItem(
  _previous: AssignItemState,
  formData: FormData,
): Promise<AssignItemState> {
  const actor = await requireClient();
  const item = await db.assetRequest.findFirst({
    where: {
      id: String(formData.get('assetRequestId') ?? ''),
      project: { clientId: actor.clientId, deletedAt: null },
    },
    select: { id: true, title: true, assigneeId: true, project: { select: { slug: true } } },
  });
  if (!item) return { status: 'error', message: 'That item is not on your projects.' };

  const contactId = String(formData.get('assigneeId') ?? '');
  const contact = contactId
    ? await db.clientContact.findFirst({
        where: { id: contactId, clientId: actor.clientId, deletedAt: null },
        select: { id: true, name: true },
      })
    : null;
  if (contactId && !contact) return { status: 'error', message: 'Choose someone on your team.' };
  if ((contact?.id ?? null) === item.assigneeId) return { status: 'done' };

  await db.assetRequest.update({ where: { id: item.id }, data: { assigneeId: contact?.id ?? null } });
  await recordAudit({
    actorType: 'client_contact',
    actorId: actor.id,
    action: 'asset_request.assigned',
    entityType: 'AssetRequest',
    entityId: item.id,
    summary: `${item.title}: ${contact ? contact.name : 'nobody'}`,
  });

  revalidatePath(`/portal/projects/${item.project.slug}`);
  revalidatePath(`/admin/projects/${item.project.slug}`);
  return { status: 'done' };
}

export type AnswerState = { status: 'idle' | 'done' | 'error'; message?: string };

/**
 * A written answer to something we asked for: a bio, a mission statement,
 * which domain they want. Answering marks the item received; they can change
 * the answer afterwards, and the latest one is what we see.
 */
export async function answerRequest(_previous: AnswerState, formData: FormData): Promise<AnswerState> {
  const actor = await requireClient();
  const item = await db.assetRequest.findFirst({
    where: {
      id: String(formData.get('assetRequestId') ?? ''),
      project: { clientId: actor.clientId, deletedAt: null },
    },
    select: { id: true, title: true, status: true, project: { select: { slug: true } } },
  });
  if (!item) return { status: 'error', message: 'That item is not on your projects.' };
  if (item.status === 'waived') return { status: 'error', message: 'We no longer need this one.' };

  const response = String(formData.get('response') ?? '').trim();
  if (!response) return { status: 'error', message: 'Write your answer first.' };
  if (response.length > 8000) {
    return { status: 'error', message: 'That is longer than this box takes. Attach it as a file instead.' };
  }

  await db.assetRequest.update({
    where: { id: item.id },
    data: {
      response,
      respondedAt: new Date(),
      ...(item.status !== 'received' ? { status: 'received', receivedAt: new Date() } : {}),
    },
  });

  await recordAudit({
    actorType: 'client_contact',
    actorId: actor.id,
    action: 'asset_request.answered',
    entityType: 'AssetRequest',
    entityId: item.id,
    summary: item.title,
  });
  await alertClientSent({
    assetRequestId: item.id,
    contactId: actor.id,
    answer: response,
    filename: null,
  }).catch((error: unknown) => console.error('[portal] team alert failed', error));

  revalidatePath(`/portal/projects/${item.project.slug}`);
  revalidatePath(`/admin/projects/${item.project.slug}`);
  return { status: 'done', message: 'Sent. You can change it here any time.' };
}
