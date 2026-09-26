import 'server-only';
import { db } from '@/lib/db';
import type { Prisma } from '@/generated/prisma/client';
import { can, type StaffActor } from './auth';

/**
 * One history, assembled from the two places it is actually recorded.
 *
 * AuditEvent answers "who changed this and when". EmailLog answers "did the
 * client ever get that link". Staff do not think of those as separate
 * questions, so the console does not show them as separate lists — they are
 * merged, newest first, and a failed send appears in the same stream as the
 * action that triggered it rather than in a table nobody opens.
 *
 * This is the reason the schema logs at all: if the email never arrived, the
 * record still knows it was meant to.
 */

export type ActivityTone = 'neutral' | 'good' | 'bad' | 'live';

export type ActivityItem = {
  id: string;
  at: Date;
  text: string;
  meta: string;
  note?: string | null;
  tone: ActivityTone;
};

/**
 * Every recorded action, said the way a person would say it. One list for the
 * activity feeds and the Activity page, so an action is named once and the
 * same everywhere.
 */
const ACTION_LABELS: Record<string, string> = {
  'client.created': 'Client added',
  'client.removed': 'Client removed',
  'project.removed': 'Project removed',
  'enquiry.removed': 'Enquiry removed',
  'enquiry.reopened': 'Enquiry opened again',
  'enquiry.restored': 'Enquiry brought back',
  'enquiry.service_line_set': 'Enquiry service line set',
  'client.invite.sent': 'Portal invitation sent',
  'client.invite.send_failed': 'Portal invitation failed to send',
  'client.invite.opened': 'Invitation opened',
  'client.invite.refused': 'Old setup link refused: the account was already set up',
  'client.account.activated': 'Client finished setting up their account',
  'client.sign_in.success': 'Client signed in',
  'client.sign_in.failed': 'Client sign-in failed',
  'client.sign_in.locked': 'Client account locked after too many attempts',
  'client.sign_in.throttled': 'Too many sign-in links requested',
  'client.sign_in.link_sent': 'Sign-in link sent',
  'client.sign_in.link_send_failed': 'Sign-in link failed to send',
  'client.contact_restored': 'Contact brought back',
  'client.details_saved': 'Client details changed',
  'client.sign_in.rejected_at_use': 'Sign-in refused: access had been removed',
  'asset_request.list_sent': 'Emailed the client what we need',
  'asset_request.list_send_failed': 'List of what we need did not reach everyone',
  'review.asked': 'Review asked for',
  'review.send_failed': 'Review asked for, but not every email went out',
  'review.approved': 'Client approved a review',
  'review.changes_requested': 'Client asked for changes in a review',
  'client.password_reset.sent': 'Link to choose a new password sent',
  'client.password_reset.send_failed': 'Link to choose a new password failed to send',
  'client.password_reset.throttled': 'Too many password links requested',
  'client.password_reset.refused': 'New password refused: access had been removed',
  'client.password_reset': 'Client chose a new password',
  'client.email_change.noted': 'Old address told about the email change',
  'client.email_change.note_failed': 'Note about the email change failed to send',
  'client.sign_out': 'Client signed out',
  'staff.sign_in.success': 'Signed in',
  'staff.sign_in.link_sent': 'Sign-in link sent',
  'staff.sign_out': 'Signed out',
  'enquiry.status_changed': 'Enquiry updated',
  'enquiry.note_saved': 'Note added to an enquiry',
  'project.status_changed': 'Project moved',
  'line_item.created': 'Fee added',
  'line_item.saved': 'Fee updated',
  'line_item.removed': 'Fee removed',
  'document.details_saved': 'Document details changed',
  'document.withdrawn': 'Document withdrawn',
  'document.discarded': 'Draft document discarded',
  'document.send_failed': 'Document email failed to send',
  'document.copilot_turn': 'Assistant used',
  'document.copilot_failed': 'Assistant failed',
  'staff.invited': 'Team member invited',
  'staff.invite.send_failed': 'Team invitation failed to send',
  'staff.role_changed': 'Team member role changed',
  'staff.deactivated': 'Team member removed',
  'staff.reactivated': 'Team member restored',
  'staff.profile_saved': 'Profile updated',
  'staff.permissions_changed': 'Permissions changed',
  'client.contact_made_main': 'Main contact changed',
  'client.password_changed': 'Client changed their password',
  'ticket.client_replied': 'Client replied to a request',
  'client.contact_added': 'Contact added',
  'staff.details_saved': 'Team member details changed',
  'client.contact_access_on': 'Portal access turned on',
  'client.contact_access_off': 'Portal access turned off',
  'client.restored': 'Client brought back',
  'project.restored': 'Project brought back',
  'client.contact_removed': 'Contact removed',
  'client.contact_saved': 'Contact details changed',
  'client.profile_saved': 'Contact details updated',
  'deliverable.assigned': 'Task assigned',
  'asset_request.assigned': 'Client item assigned',
  'project.owner_changed': 'Project lead changed',
  'deliverable.completed': 'Task done',
  'deliverable.reopened': 'Task reopened',
  'asset_request.status_changed': 'Client item updated',
  'asset_request.answered': 'Client answered',
  'project.details_saved': 'Project details changed',
  'phase.added': 'Phase added',
  'phase.saved': 'Phase changed',
  'phase.removed': 'Phase removed',
  'deliverable.added': 'Task added',
  'deliverable.renamed': 'Task changed',
  'deliverable.removed': 'Task removed',
  'asset_request.added': 'Added to what we need from the client',
  'asset_request.saved': 'Request to the client changed',
  'asset_request.removed': 'Request to the client removed',
  'brand_kit.saved': 'Brand kit saved',
  'client.setup_link.created': 'Setup link made',
  'asset.uploaded': 'Client sent a file',
  'invoice.created': 'Invoice created',
  'invoice.draft_saved': 'Draft invoice changed',
  'invoice.sent': 'Invoice sent',
  'invoice.voided': 'Invoice voided',
  'payment.recorded': 'Payment recorded',
  'payment.reversed': 'Payment reversed',
  'refund.recorded': 'Refund recorded',
  'refund.cancelled': 'Refund cancelled',
  'cost.recorded': 'Cost added',
  'cost.changed': 'Cost changed',
  'cost.removed': 'Cost removed',
  'cost.bill_attached': 'Bill attached to a cost',
  'cost.bill_removed': 'Bill taken off a cost',
  'regular_cost.saved': 'Regular cost saved',
  'regular_cost.stopped': 'Regular cost stopped',
  'regular_cost.restarted': 'Regular cost started again',
  'exchange_rate.saved': 'Exchange rate saved',
  'income.recorded': 'Income added',
  'income.changed': 'Income changed',
  'income.removed': 'Income removed',
  'product.added': 'Product added',
  'product.renamed': 'Product renamed',
  'product.stopped': 'Product stopped',
  'product.restarted': 'Product offered again',
  'renewal.skipped': 'Renewal period skipped',
  'renewal.brought_back': 'Skipped renewal brought back',
  'refund.sent': 'Refund note sent',
  'refund.send_failed': 'Refund note email failed to send',
  'project_update.drafted': 'Update drafted',
  'project_update.edited': 'Draft update changed',
  'project_update.discarded': 'Draft update discarded',
  'project_update.sent': 'Update sent to the client',
  'project_update.send_failed': 'Update published, but not every email went out',
  'project_update.published': 'Update published to the portal',
  'project_update.taken_down': 'Update taken down from the portal',
  'project_update.put_back': 'Update put back in the portal',
  'document.created': 'Document started',
  'document.version_saved': 'Document edited',
  'document.sent': 'Sent for signature',
  'document.resent': 'Signing link emailed again',
  'document.link_shared': 'Link to sign made, to share by hand',
  'document_defaults.saved': 'Standard sections for documents changed',
  'review.link_shared': 'Link to answer a review made, to share by hand',
  'document.resend_failed': 'Signing link failed to send again',
  'document.signed': 'Document signed',
  'document.signed_copy.send_failed': 'Signed copy failed to send',
  'document.declined': 'Client declined a document',
  'document.changes_requested': 'Client asked for changes',
  'document.fresh_copy_asked': 'Client asked for a fresh copy to sign',
  'document.wording_suggested': 'Client suggested their own wording',
  'document.suggestion_used': 'Next version started from their wording',
  'document.suggestion_set_aside': 'Their suggested wording set aside',
  'document.hash_mismatch': 'Signature refused: the document had changed',
  'ticket.raised': 'New request from a client',
  'ticket.replied': 'Reply sent',
  'post.created': 'Post started',
  'post.saved': 'Post edited',
  'post.published': 'Post published',
  'post.scheduled': 'Post scheduled',
  'post.unpublished': 'Post taken down',
  'post.archived': 'Post archived',
  'media.uploaded': 'Image uploaded',
  'settings.billing_saved': 'Billing details changed',
  'assistant.failed': 'Assistant could not answer',
  'writer.created': 'Writer added',
  'writer.updated': 'Writer details changed',
  'writer.archived': 'Writer taken off the list',
  'receipt.sent': 'Receipt sent',
  'receipt.send_failed': 'Receipt email failed to send',
  'invoice.issued': 'Invoice issued',
  'project.created': 'Project started',
  'staff.owner_created': 'Owner account created',
  'staff.sign_in.refused': 'Sign-in refused',
  'staff.sign_in.rejected_at_use': 'Sign-in refused: access had been removed',
  'staff.sign_in.throttled': 'Too many sign-in links requested',
  'ticket.triaged': 'Request sorted',
};

/** An action's label, or its code made readable when it has none yet. */
export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action.replace(/[._]/g, ' ');
}

/** Enum-ish action strings turned into something a person would say. */
function describeAudit(action: string, summary: string | null): string {
  const base = actionLabel(action);
  if (!summary) return base;
  // Older lines were written with dashes; they read the same with a colon.
  return `${base}: ${summary.replace(/\s+[—–]\s+/g, ': ')}`;
}

function auditTone(action: string): ActivityTone {
  if (action.includes('failed') || action.includes('locked') || action.includes('rejected')) {
    return 'bad';
  }
  if (action.includes('voided') || action.includes('reversed') || action.includes('declined')) {
    return 'bad';
  }
  if (action.includes('hash_mismatch')) return 'bad';
  if (action.endsWith('.signed') || action.endsWith('.published') || action.endsWith('.uploaded')) {
    return 'good';
  }
  if (action.includes('send_failed')) return 'bad';
  if (
    action.includes('activated') ||
    action.includes('completed') ||
    action.startsWith('payment.recorded')
  ) {
    return 'good';
  }
  if (action.includes('sent') || action.includes('created')) return 'live';
  return 'neutral';
}

/**
 * Entity ids that belong to one client, so the client's page can show the
 * history of its projects and people as well as of the client row itself.
 */
export async function activityForClient(
  clientId: string,
  limit = 40,
): Promise<ActivityItem[]> {
  const [contacts, projects, invoices] = await Promise.all([
    db.clientContact.findMany({ where: { clientId }, select: { id: true } }),
    db.project.findMany({ where: { clientId }, select: { id: true } }),
    db.invoice.findMany({ where: { clientId }, select: { id: true } }),
  ]);

  const ids = [
    clientId,
    ...contacts.map((c) => c.id),
    ...projects.map((p) => p.id),
    ...invoices.map((i) => i.id),
  ];

  return activityFor(ids, limit);
}

/** Lines about invoices and payments, about prices, and about costs. */
const BILLING_ACTIONS = ['invoice.', 'payment.', 'receipt.', 'refund.'];
const FEE_ACTIONS = ['line_item.'];
const FINANCE_ACTIONS = ['cost.', 'regular_cost.', 'exchange_rate.', 'income.', 'product.'];

/**
 * The kinds of line that carry amounts this person is not allowed to see,
 * as action prefixes. Left out wherever the record is shown to them.
 */
export function moneyActionsHiddenFrom(staff: StaffActor): string[] {
  const billing = can(staff, 'invoices');
  const fees = billing || can(staff, 'fees');
  return [
    ...(billing ? [] : BILLING_ACTIONS),
    ...(fees ? [] : FEE_ACTIONS),
    ...(can(staff, 'finance') ? [] : FINANCE_ACTIONS),
  ];
}

export const actionStartsWith = (prefixes: string[]): Prisma.AuditEventWhereInput => ({
  OR: prefixes.map((prefix) => ({ action: { startsWith: prefix } })),
});

/** Who did each thing, by name: there is more than one of us. */
async function whoDid(
  audits: { actorType: string; actorId: string | null }[],
): Promise<(audit: { actorType: string; actorId: string | null }) => string> {
  const ids = [
    ...new Set(audits.flatMap((a) => (a.actorType === 'staff' && a.actorId ? [a.actorId] : []))),
  ];
  const people = ids.length
    ? await db.staffUser.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
    : [];
  const names = new Map(people.map((person) => [person.id, person.name]));
  return (audit) =>
    audit.actorType === 'staff'
      ? ((audit.actorId && names.get(audit.actorId)) ?? 'Us')
      : audit.actorType === 'client_contact'
        ? 'Client'
        : 'System';
}

export async function activityFor(entityIds: string[], limit = 40): Promise<ActivityItem[]> {
  if (entityIds.length === 0) return [];

  const [audits, emails] = await Promise.all([
    db.auditEvent.findMany({
      where: { entityId: { in: entityIds } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        action: true,
        summary: true,
        actorType: true,
        actorId: true,
        createdAt: true,
      },
    }),
    db.emailLog.findMany({
      where: { entityId: { in: entityIds } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        toAddress: true,
        subject: true,
        status: true,
        error: true,
        createdAt: true,
        sentAt: true,
      },
    }),
  ]);

  const who = await whoDid(audits);
  const items: ActivityItem[] = [
    ...audits.map((audit) => ({
      id: `audit-${audit.id}`,
      at: audit.createdAt,
      text: describeAudit(audit.action, audit.summary),
      meta: who(audit),
      tone: auditTone(audit.action),
    })),
    ...emails.map((email) => ({
      id: `email-${email.id}`,
      at: email.createdAt,
      // "sent" means the email service accepted it, which is all we can know —
      // not that it reached an inbox.
      text:
        email.status === 'sent'
          ? `Email sent to ${email.toAddress}`
          : `Email to ${email.toAddress} failed`,
      meta: email.subject,
      note: email.status === 'sent' ? null : email.error,
      tone: (email.status === 'sent' ? 'good' : 'bad') as ActivityTone,
    })),
  ];

  return items.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, limit);
}

/** Actions too routine to fill a dashboard with. */
const QUIET = ['staff.sign_in.success', 'staff.sign_in.link_sent', 'staff.sign_out', 'client.sign_out'];

/** The latest things that happened anywhere, for the overview. */
export async function recentActivity(staff: StaffActor, limit = 8): Promise<ActivityItem[]> {
  const hidden = moneyActionsHiddenFrom(staff);
  const audits = await db.auditEvent.findMany({
    where: {
      action: { notIn: QUIET },
      ...(hidden.length ? { NOT: actionStartsWith(hidden) } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      action: true,
      summary: true,
      actorType: true,
      actorId: true,
      createdAt: true,
    },
  });

  const who = await whoDid(audits);
  return audits.map((audit) => ({
    id: `audit-${audit.id}`,
    at: audit.createdAt,
    text: describeAudit(audit.action, audit.summary),
    meta: who(audit),
    tone: auditTone(audit.action),
  }));
}
