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

/** Enum-ish action strings turned into something a person would say. */
function describeAudit(action: string, summary: string | null): string {
  const said: Record<string, string> = {
    'client.created': 'Client created',
    'client.invite.sent': 'Portal invitation sent',
    'client.invite.opened': 'Invitation link opened',
    'client.account.activated': 'Client set up their account',
    'client.sign_in.success': 'Client signed in',
    'client.sign_in.failed': 'Failed client sign-in',
    'client.sign_in.locked': 'Client account locked after repeated failures',
    'client.sign_in.throttled': 'Too many sign-in links requested',
    'client.sign_in.link_sent': 'Sign-in link sent',
    'client.sign_in.rejected_at_use': 'Sign-in link refused — access had been revoked',
    'client.sign_out': 'Client signed out',
    'staff.sign_in.success': 'Staff signed in',
    'staff.sign_in.link_sent': 'Staff sign-in link sent',
    'staff.sign_out': 'Staff signed out',
    'enquiry.status_changed': 'Enquiry moved',
    'enquiry.note_saved': 'Note saved on the enquiry',
    'project.status_changed': 'Project moved',
    'line_item.saved': 'Fee line updated',
    'deliverable.completed': 'Item ticked off',
    'deliverable.reopened': 'Item reopened',
    'asset_request.status_changed': 'Something we asked for was updated',
    'invoice.created': 'Invoice raised',
    'invoice.sent': 'Invoice sent',
    'invoice.voided': 'Invoice voided',
    'payment.recorded': 'Payment recorded',
    'payment.reversed': 'Payment reversed',
  };
  const base = said[action] ?? action.replace(/[._]/g, ' ');
  return summary ? `${base} — ${summary}` : base;
}

function auditTone(action: string): ActivityTone {
  if (action.includes('failed') || action.includes('locked') || action.includes('rejected')) {
    return 'bad';
  }
  if (action.includes('voided') || action.includes('reversed')) return 'bad';
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
      meta: audit.actorType === 'staff' ? 'by us' : audit.actorType === 'client_contact' ? 'by the client' : 'automatic',
      tone: auditTone(audit.action),
    })),
    ...emails.map((email) => ({
      id: `email-${email.id}`,
      at: email.createdAt,
      text:
        email.status === 'sent'
          ? `Email delivered to ${email.toAddress}`
          : `Email to ${email.toAddress} did not send`,
      meta: email.subject,
      note: email.status === 'sent' ? null : email.error,
      tone: (email.status === 'sent' ? 'good' : 'bad') as ActivityTone,
    })),
  ];

  return items.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, limit);
}
