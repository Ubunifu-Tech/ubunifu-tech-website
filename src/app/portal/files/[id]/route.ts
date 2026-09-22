import { getClientActor } from '@/lib/console/auth';
import { db } from '@/lib/db';
import { streamUpload } from '@/lib/console/uploads';

/**
 * A client reading back a file from their own project.
 *
 * Blobs are private, so the store will not serve this to anyone holding the
 * URL — it comes through here, and here checks the session first. Ownership is
 * expressed in the query rather than as an `if`: a file on another client's
 * project simply does not match, and a guessed id is a 404 like any other.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const actor = await getClientActor();
  if (!actor || !actor.isActivated) return new Response(null, { status: 404 });

  const { id } = await params;
  const file = await db.fileUpload.findFirst({
    where: {
      id,
      deletedAt: null,
      assetRequest: { project: { clientId: actor.clientId, deletedAt: null } },
    },
    select: { storageKey: true, filename: true },
  });
  if (!file) return new Response(null, { status: 404 });

  return streamUpload(file.storageKey, file.filename);
}
