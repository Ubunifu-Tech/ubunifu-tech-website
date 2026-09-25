import 'server-only';
import { db } from '@/lib/db';

/**
 * The addresses each update has reached, from the mail log: a send the mail
 * service accepted. What happened after it left us is not known here.
 */
export async function emailedAddresses(updateIds: string[]): Promise<Map<string, Set<string>>> {
  const sent = await db.emailLog.findMany({
    where: {
      entityType: 'ProjectUpdate',
      entityId: { in: updateIds },
      template: 'project_update',
      status: 'sent',
    },
    select: { entityId: true, toAddress: true },
  });
  const byUpdate = new Map<string, Set<string>>();
  for (const row of sent) {
    if (!row.entityId) continue;
    const set = byUpdate.get(row.entityId) ?? new Set<string>();
    set.add(row.toAddress.toLowerCase());
    byUpdate.set(row.entityId, set);
  }
  return byUpdate;
}
