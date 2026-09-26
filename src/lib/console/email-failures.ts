import 'server-only';
import { db } from '@/lib/db';
import { can, type StaffActor } from '@/lib/console/auth';
import type { Permission } from '@/lib/console/permissions';

/**
 * Who can put a failed email right by sending it again, by the kind of
 * email. Notices to the team, and emails people ask for themselves, are not
 * here: there is no button anywhere that sends them again.
 */
const SENT_AGAIN_BY: Record<string, Permission | 'owner'> = {
  client_invite: 'clients',
  colleague_invite: 'clients',
  client_sign_in: 'clients',
  invoice_sent: 'invoices',
  receipt_sent: 'invoices',
  refund_sent: 'invoices',
  document_to_sign: 'documents',
  project_update: 'projects',
  items_needed: 'projects',
  review_request: 'projects',
  ticket_reply_to_client: 'requests',
  staff_invite: 'owner',
};

/** Whether this person has a way to send this kind of email again. */
export function canSendAgain(staff: StaffActor, template: string): boolean {
  const need = SENT_AGAIN_BY[template];
  if (!need) return false;
  return need === 'owner' ? staff.role === 'owner' : can(staff, need);
}

/**
 * Emails that did not send and have not been sent since: the same kind of
 * email, about the same record, to the same address. A failure put right by
 * sending again is history, not a task, and counting it forever teaches
 * everyone to ignore the count. Only the ones this person can send again:
 * the rest stay in the record as failed, without asking anyone to act.
 */
export async function unresolvedEmailFailures(staff: StaffActor, limit = 500) {
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
      canSendAgain(staff, row.template) &&
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
