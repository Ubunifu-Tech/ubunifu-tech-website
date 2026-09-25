import 'server-only';
import { sendConsoleEmail } from './mailer';

/** Where the team hears about what clients do. */
export const TEAM_INBOX = 'info@ubunifutech.com';

/**
 * Our own alert about something a client did on a project: to the team inbox,
 * and to the person who owns the project when they have another address.
 *
 * Sent after the client's action is saved and outside any transaction. A
 * failure here costs the team promptness and nothing else, and the mail log
 * keeps it.
 */
export async function alertTeam(input: {
  owner?: { email: string; isActive: boolean } | null;
  subject: string;
  html: string;
  template: string;
  entityType: string;
  entityId: string;
  /** The client's address, so answering the alert answers them. */
  replyTo?: string | null;
}) {
  const to = [TEAM_INBOX];
  if (input.owner?.isActive && input.owner.email.toLowerCase() !== TEAM_INBOX) {
    to.push(input.owner.email);
  }
  for (const address of to) {
    await sendConsoleEmail({
      to: address,
      subject: input.subject,
      html: input.html,
      template: input.template,
      entityType: input.entityType,
      entityId: input.entityId,
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    });
  }
}
