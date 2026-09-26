import { NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { db } from '@/lib/db';
import { can, getStaffActor } from '@/lib/console/auth';
import { allow } from '@/lib/console/rate-limit';
import { recordCostBill } from '@/lib/console/cost-bills';
import { BILL_CONTENT_TYPES, MAX_BILL_BYTES, billFolder } from '@/lib/console/cost-labels';
import { safeFilename, uploadsConfigured } from '@/lib/console/uploads';

/**
 * Issues the token a staff browser uses to send a cost's bill straight to the
 * store. Reached as /finance/costs/upload on the console host only.
 *
 * The token is scoped to the cost's own folder, to PDFs and photos, and to
 * ten megabytes; everything the browser can do with it is decided here.
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
        const staff = await getStaffActor();
        if (!staff || !can(staff, 'finance')) throw new Error('not-allowed');
        if (!(await allow('cost-bill-upload', staff.id, { limit: 60, windowMinutes: 60 }))) {
          throw new Error('too-many-uploads');
        }

        const cost = await db.cost.findUnique({
          where: { id: String(clientPayload ?? '') },
          select: { id: true },
        });
        if (!cost || !pathname.startsWith(`${billFolder(cost.id)}/`)) throw new Error('not-allowed');

        return {
          allowedContentTypes: BILL_CONTENT_TYPES,
          maximumSizeInBytes: MAX_BILL_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            costId: cost.id,
            staffId: staff.id,
            filename: safeFilename(pathname.split('/').pop() ?? 'bill'),
          }),
        };
      },

      // The store's own callback; only fires on a real deployment. Verified
      // by handleUpload before this runs.
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const payload = JSON.parse(tokenPayload ?? '{}') as {
          costId?: string;
          staffId?: string;
          filename?: string;
        };
        if (!payload.costId) return;
        await recordCostBill({
          blobUrl: blob.url,
          costId: payload.costId,
          staffId: payload.staffId ?? null,
          filename: payload.filename ?? 'bill',
        });
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    const refusal = error instanceof Error ? error.message : '';
    if (refusal === 'too-many-uploads') {
      return NextResponse.json({ error: 'That is a lot of uploads. Try again in an hour.' }, { status: 429 });
    }
    if (refusal === 'not-allowed') {
      console.error('[costs] bill upload refused');
      return NextResponse.json({ error: 'That upload is not allowed.' }, { status: 403 });
    }
    console.error('[costs] bill upload failed', error);
    return NextResponse.json(
      { error: 'Uploads are not working right now. Try again in a few minutes.' },
      { status: 502 },
    );
  }
}
