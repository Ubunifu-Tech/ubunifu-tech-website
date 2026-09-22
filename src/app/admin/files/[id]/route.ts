import { getStaffActor } from '@/lib/console/auth';
import { db } from '@/lib/db';
import { streamUpload } from '@/lib/console/uploads';

/** The same file, read by us. Reached as /files/<id> on the console host. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const staff = await getStaffActor();
  if (!staff) return new Response(null, { status: 404 });

  const { id } = await params;
  const file = await db.fileUpload.findFirst({
    where: { id, deletedAt: null },
    select: { storageKey: true, filename: true },
  });
  if (!file) return new Response(null, { status: 404 });

  return streamUpload(file.storageKey, file.filename);
}
