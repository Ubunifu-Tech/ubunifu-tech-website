import 'server-only';
import { head } from '@vercel/blob';
import { db } from '@/lib/db';
import { recordAudit } from './auth';
import { BILL_CONTENT_TYPES, MAX_BILL_BYTES, billFolder } from './cost-labels';
import { storedUnder } from './uploads';

/**
 * Records the bill behind a cost, once the browser has sent it to the store.
 *
 * Idempotent on the stored address, so the browser's confirmation and the
 * store's own callback can both arrive. The URL must be in the cost's own
 * folder, and its size and type are read back from the store rather than
 * taken on trust. A new bill replaces the last one, which is kept, marked.
 */
export async function recordCostBill(input: {
  blobUrl: string;
  costId: string;
  staffId: string | null;
  filename: string;
}): Promise<{ id: string }> {
  if (!storedUnder(input.blobUrl, billFolder(input.costId))) throw new Error('bill-not-ours');

  const existing = await db.fileUpload.findUnique({
    where: { storageKey: input.blobUrl },
    select: { id: true, costId: true },
  });
  if (existing) {
    if (existing.costId !== input.costId) throw new Error('bill-not-ours');
    return { id: existing.id };
  }

  const meta = await head(input.blobUrl);
  if (!BILL_CONTENT_TYPES.includes(meta.contentType)) throw new Error('bill-wrong-type');
  if (meta.size > MAX_BILL_BYTES) throw new Error('bill-too-large');

  const cost = await db.cost.findUnique({
    where: { id: input.costId },
    select: { id: true, vendor: true },
  });
  if (!cost) throw new Error('cost-gone');

  let created: { id: string };
  try {
    created = await db.$transaction(async (tx) => {
      await tx.fileUpload.updateMany({
        where: { costId: cost.id, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      return tx.fileUpload.create({
        data: {
          storageKey: input.blobUrl,
          filename: input.filename.slice(0, 200),
          contentType: meta.contentType,
          sizeBytes: meta.size,
          uploadedByType: 'staff',
          uploadedById: input.staffId,
          costId: cost.id,
        },
        select: { id: true },
      });
    });
  } catch (error) {
    // The other writer got here first; the unique key did its job.
    if ((error as { code?: string }).code === 'P2002') {
      const winner = await db.fileUpload.findUnique({
        where: { storageKey: input.blobUrl },
        select: { id: true },
      });
      if (winner) return winner;
    }
    throw error;
  }

  await recordAudit({
    actorType: 'staff',
    actorId: input.staffId,
    action: 'cost.bill_attached',
    entityType: 'Cost',
    entityId: cost.id,
    summary: `${cost.vendor}: ${input.filename}`,
  });
  return created;
}
