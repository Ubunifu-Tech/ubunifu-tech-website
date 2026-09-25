import 'server-only';
import { db } from '@/lib/db';

/**
 * Emails that did not send and have not been sent since: the same kind of
 * email, about the same record, to the same address. A failure put right by
 * sending again is history, not a task, and counting it forever teaches
 * everyone to ignore the count.
 */
export async function unresolvedEmailFailures(limit = 500) {
  const failed = await db.emailLog.findMany({
    where: { status: 'failed' },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      toAddress: true,
      template: true,
      entityType: true,
      entityId: true,
      createdAt: true,
    },
  });
  if (failed.length === 0) return [];

  const sentSince = await db.emailLog.findMany({
    where: {
      status: 'sent',
      toAddress: { in: [...new Set(failed.map((row) => row.toAddress))] },
      template: { in: [...new Set(failed.map((row) => row.template))] },
      createdAt: { gt: failed[failed.length - 1]!.createdAt },
    },
    select: { toAddress: true, template: true, entityType: true, entityId: true, createdAt: true },
  });

  return failed.filter(
    (row) =>
      !sentSince.some(
        (sent) =>
          sent.toAddress.toLowerCase() === row.toAddress.toLowerCase() &&
          sent.template === row.template &&
          sent.entityType === row.entityType &&
          sent.entityId === row.entityId &&
          sent.createdAt > row.createdAt,
      ),
  );
}
