import 'server-only';
import { db } from '@/lib/db';
import { clientSentEmail } from '@/lib/emails';
import { consoleEnv } from './env';
import { sendConsoleEmail, type SendResult } from './mailer';
import type { StaffRole } from '@/generated/prisma/client';
import { permissionsForRole, readRolePermissions, type Permission } from './permissions';
import { allow } from './rate-limit';

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
  owner?: { email: string; isActive: boolean; role?: StaffRole } | null;
  /**
   * What the alert links to needs this permission, so the owner is copied
   * only if their role has it: a link that ends on "no access" is no help.
   */
  need?: Permission;
  subject: string;
  html: string;
  template: string;
  entityType: string;
  entityId: string;
  /** The client's address, so answering the alert answers them. */
  replyTo?: string | null;
}): Promise<SendResult> {
  const to = [TEAM_INBOX];
  if (
    input.owner?.isActive &&
    input.owner.email.toLowerCase() !== TEAM_INBOX &&
    (await mayOpen(input.owner, input.need))
  ) {
    to.push(input.owner.email);
  }
  const results: SendResult[] = [];
  for (const address of to) {
    results.push(
      await sendConsoleEmail({
        to: address,
        subject: input.subject,
        html: input.html,
        template: input.template,
        entityType: input.entityType,
        entityId: input.entityId,
        ...(input.replyTo ? { replyTo: input.replyTo } : {}),
      }),
    );
  }
  // What the team inbox got, which is what callers report.
  return results[0]!;
}

/** Whether a project owner's role lets them open what an alert links to. */
async function mayOpen(
  owner: { role?: StaffRole },
  need: Permission | undefined,
): Promise<boolean> {
  if (!need) return true;
  if (!owner.role) return false;
  const settings = await db.orgSettings.findUnique({
    where: { id: 'default' },
    select: { rolePermissions: true },
  });
  return permissionsForRole(owner.role, readRolePermissions(settings?.rolePermissions)).includes(
    need,
  );
}

/**
 * Tells the team a client sent something we asked for: an answer, or a file.
 *
 * At most one alert per project every fifteen minutes. A client sending ten
 * photographs one after another is one email, not ten, and the project page
 * shows everything that arrived.
 */
export async function alertClientSent(input: {
  assetRequestId: string;
  contactId: string;
  answer: string | null;
  filename: string | null;
}) {
  const item = await db.assetRequest.findUnique({
    where: { id: input.assetRequestId },
    select: {
      title: true,
      project: {
        select: {
          id: true,
          slug: true,
          name: true,
          deletedAt: true,
          owner: { select: { email: true, isActive: true } },
          client: { select: { name: true } },
        },
      },
    },
  });
  if (!item || item.project.deletedAt) return;
  if (!(await allow('client-sent-alert', item.project.id, { limit: 1, windowMinutes: 15 }))) {
    return;
  }

  const contact = await db.clientContact.findUnique({
    where: { id: input.contactId },
    select: { name: true, email: true },
  });
  const from = contact?.name ?? item.project.client.name;
  await alertTeam({
    owner: item.project.owner,
    subject: `${item.project.name}: ${from} sent ${input.answer ? 'an answer' : 'a file'}`,
    html: clientSentEmail({
      clientName: item.project.client.name,
      from,
      projectName: item.project.name,
      itemTitle: item.title,
      answer: input.answer,
      filename: input.filename,
      url: `${consoleEnv.adminOrigin}/projects/${item.project.slug}#from-the-client`,
    }),
    template: 'client_sent',
    entityType: 'AssetRequest',
    entityId: input.assetRequestId,
    replyTo: contact?.email,
  });
}
