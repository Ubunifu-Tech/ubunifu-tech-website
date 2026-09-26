import { NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { db } from '@/lib/db';
import { getClientActor } from '@/lib/console/auth';
import { allow } from '@/lib/console/rate-limit';
import {
  ALLOWED_CONTENT_TYPES,
  MAX_UPLOAD_BYTES,
  recordAssetUpload,
  safeFilename,
  uploadsConfigured,
} from '@/lib/console/uploads';

/**
 * Issues the short-lived token a browser uses to upload straight to the store.
 *
 * THIS IS THE ONLY PLACE THE DECISION IS MADE. The token it hands back is
 * scoped to one path, one set of content types and one size — everything the
 * browser can do with it was decided here, by a server that checked the
 * session and checked that the asset request being answered belongs to the
 * client whose session it is.
 *
 * On the public host, because the console host serves no /api at all.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!uploadsConfigured()) {
    return NextResponse.json({ error: 'Uploads are not configured here.' }, { status: 503 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const actor = await getClientActor();
        if (!actor || !actor.isActivated) throw new Error('not-signed-in');
        // Generous for real work, a ceiling for a script filling the store.
        if (!(await allow('portal-upload', actor.id, { limit: 60, windowMinutes: 60 }))) {
          throw new Error('too-many-uploads');
        }

        const assetRequestId = String(clientPayload ?? '');
        // Scoped in the query: an asset request on somebody else's project
        // does not match, so a guessed id is a token that is never issued.
        const assetRequest = await db.assetRequest.findFirst({
          where: {
            id: assetRequestId,
            project: { clientId: actor.clientId, deletedAt: null },
          },
          select: { id: true, projectId: true },
        });
        if (!assetRequest) throw new Error('not-yours');
        if (!pathname.startsWith(`requests/${assetRequest.id}/`)) throw new Error('not-yours');

        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          addRandomSuffix: true,
          // Carried through to the completion callback, which arrives from
          // the store rather than from the browser and so has no session.
          tokenPayload: JSON.stringify({
            assetRequestId: assetRequest.id,
            contactId: actor.id,
            filename: safeFilename(pathname.split('/').pop() ?? 'file'),
          }),
        };
      },

      /**
       * The store's own callback, which only fires on a real deployment — it
       * cannot reach a laptop. The browser records the upload too, as soon as
       * it finishes, and the row is keyed on the blob URL, so whichever of
       * the two arrives second finds it already written.
       */
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const payload = JSON.parse(tokenPayload ?? '{}') as {
          assetRequestId?: string;
          contactId?: string;
          filename?: string;
        };
        if (!payload.assetRequestId) return;

        await recordAssetUpload({
          blobUrl: blob.url,
          assetRequestId: payload.assetRequestId,
          actor: { type: 'client_contact', id: payload.contactId ?? null },
          filename: payload.filename ?? 'file',
        });
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    const refusal = error instanceof Error ? error.message : '';
    if (refusal === 'too-many-uploads') {
      return NextResponse.json(
        { error: 'That is a lot of uploads in one go. Try again in an hour.' },
        { status: 429 },
      );
    }
    if (refusal === 'not-yours' || refusal === 'not-signed-in') {
      // Deliberately the same answer for both: to somebody probing they are
      // one and the same, and the real reason is in the server log.
      console.error('[uploads] token refused:', refusal);
      return NextResponse.json({ error: 'That upload is not allowed.' }, { status: 400 });
    }
    // Anything else is the storage service or our database, not the person.
    console.error('[uploads] upload failed', error);
    return NextResponse.json(
      { error: 'Uploads are not working right now. Try again in a few minutes.' },
      { status: 502 },
    );
  }
}
