import 'server-only';
import { db } from '@/lib/db';

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
  'client.sign_in.rejected_at_use': 'Sign-in refused: access had been removed',
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
  'deliverable.renamed': 'Task renamed',
  'deliverable.removed': 'Task removed',
  'asset_request.added': 'Asked the client for something',
  'asset_request.saved': 'Request to the client changed',
  'asset_request.removed': 'Request to the client removed',
  'brand_kit.saved': 'Brand kit saved',
  'client.setup_link.created': 'Setup link made',
  'asset.uploaded': 'Client sent a file',
  'invoice.created': 'Invoice created',
  'invoice.sent': 'Invoice sent',
  'invoice.voided': 'Invoice voided',
  'payment.recorded': 'Payment recorded',
  'payment.reversed': 'Payment reversed',
  'refund.recorded': 'Refund recorded',
  'refund.sent': 'Refund note sent',
  'refund.send_failed': 'Refund note email failed to send',
  'project_update.drafted': 'Update drafted',
  'project_update.sent': 'Update sent to the client',
  'project_update.send_failed': 'Update published, but the email failed',
  'project_update.published': 'Update published to the portal',
  'document.created': 'Document started',
  'document.version_saved': 'Document edited',
  'document.sent': 'Sent for signature',
  'document.signed': 'Document signed',
  'document.signed_copy.send_failed': 'Signed copy failed to send',
  'document.declined': 'Client declined a document',
  'document.changes_requested': 'Client asked for changes',
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

  const items: ActivityItem[] = [
    ...audits.map((audit) => ({
      id: `audit-${audit.id}`,
      at: audit.createdAt,
      text: describeAudit(audit.action, audit.summary),
      meta: audit.actorType === 'staff' ? 'You' : audit.actorType === 'client_contact' ? 'Client' : 'System',
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
export async function recentActivity(limit = 8): Promise<ActivityItem[]> {
  const audits = await db.auditEvent.findMany({
    where: { action: { notIn: QUIET } },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: { id: true, action: true, summary: true, actorType: true, createdAt: true },
  });

  return audits.map((audit) => ({
    id: `audit-${audit.id}`,
    at: audit.createdAt,
    text: describeAudit(audit.action, audit.summary),
    meta: audit.actorType === 'staff' ? 'You' : audit.actorType === 'client_contact' ? 'Client' : 'System',
    tone: auditTone(audit.action),
  }));
}
