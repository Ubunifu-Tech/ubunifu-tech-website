import { NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { can, getStaffActor } from '@/lib/console/auth';
import { uploadsConfigured } from '@/lib/console/uploads';
import { MAX_MEDIA_BYTES, MEDIA_CONTENT_TYPES, recordMediaAsset } from '@/lib/console/media';

/**
 * Issues the token a staff browser uses to upload a website image straight to
 * the store.
 *
 * On the CONSOLE host only, reached as admin.ubunifutech.com/media/upload: the
 * public host 404s everything under /admin, and on the public host
 * /media/upload is just an image name that does not parse. So no visitor can
 * ask for a token at all, and a staff session is checked here as well.
 *
 * Not under /api, because the console host serves no /api — see src/proxy.ts.
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
      onBeforeGenerateToken: async () => {
        const staff = await getStaffActor();
        if (!staff || !can(staff, 'journal')) throw new Error('not-staff');

        return {
          allowedContentTypes: MEDIA_CONTENT_TYPES,
          maximumSizeInBytes: MAX_MEDIA_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ staffId: staff.id }),
        };
      },

      // The store's own callback; only fires on a real deployment. Verified by
      // handleUpload (an HMAC against the read-write token) before this runs.
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const payload = JSON.parse(tokenPayload ?? '{}') as { staffId?: string };
        await recordMediaAsset({
          blobUrl: blob.url,
          filename: blob.pathname.split('/').pop() ?? 'image',
          staffId: payload.staffId ?? null,
        });
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[media] upload refused', error);
    return NextResponse.json({ error: 'That upload is not allowed.' }, { status: 400 });
  }
}
