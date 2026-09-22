import 'server-only';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { db } from '@/lib/db';
import type { ActorType, StaffRole } from '@/generated/prisma/client';
import { consoleEnv, isAdminHost } from './env';
import { readSession } from './session';

/**
 * Authorisation, enforced on the server where the database is reachable.
 *
 * Middleware cannot do this. It runs on the Edge runtime with no Postgres and
 * no Node crypto, so it can only route by host and check that a cookie exists.
 * Every actual access decision is made here, in a Node-runtime server
 * component or route handler. Treat middleware as routing, never as a gate.
 */

export type StaffActor = {
  id: string;
  email: string;
  name: string;
  role: StaffRole;
};

export type ClientActor = {
  id: string;
  email: string;
  name: string;
  clientId: string;
  clientName: string;
  isActivated: boolean;
};

/**
 * Defence in depth. Admin pages are only reachable on the admin host because
 * middleware rewrites them there, but a misconfigured rewrite or a future route
 * added by hand should not become an exposure. 404 rather than 403: a wrong
 * host is told nothing about what exists.
 */
async function assertAdminHost(): Promise<void> {
  const headerList = await headers();
  if (!isAdminHost(headerList.get('host'))) {
    notFound();
  }
}

export async function getStaffActor(): Promise<StaffActor | null> {
  const session = await readSession('admin');
  if (!session || session.actorType !== 'staff') return null;

  const staff = await db.staffUser.findUnique({
    where: { id: session.actorId },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });

  if (!staff || !staff.isActive) return null;

  // The allowlist is checked on every request, not only at sign-in, so removing
  // an address takes effect immediately rather than when a session expires.
  if (!consoleEnv.staffAllowlist.includes(staff.email.toLowerCase())) {
    return null;
  }

  return {
    id: staff.id,
    email: staff.email,
    name: staff.name,
    role: staff.role,
  };
}

export async function requireStaff(): Promise<StaffActor> {
  await assertAdminHost();
  const staff = await getStaffActor();
  if (!staff) {
    redirect('/sign-in');
  }
  return staff;
}

const ROLE_RANK: Record<StaffRole, number> = {
  member: 1,
  admin: 2,
  owner: 3,
};

export async function requireStaffRole(minimum: StaffRole): Promise<StaffActor> {
  const staff = await requireStaff();
  if (ROLE_RANK[staff.role] < ROLE_RANK[minimum]) {
    notFound();
  }
  return staff;
}

export async function getClientActor(): Promise<ClientActor | null> {
  const session = await readSession('portal');
  if (!session || session.actorType !== 'client_contact') return null;

  const contact = await db.clientContact.findUnique({
    where: { id: session.actorId },
    select: {
      id: true,
      email: true,
      name: true,
      canSignIn: true,
      activatedAt: true,
      deletedAt: true,
      client: { select: { id: true, name: true, deletedAt: true } },
    },
  });

  if (!contact) return null;
  if (!contact.canSignIn) return null;
  if (contact.deletedAt) return null;
  if (contact.client.deletedAt) return null;

  return {
    id: contact.id,
    email: contact.email,
    name: contact.name,
    clientId: contact.client.id,
    clientName: contact.client.name,
    isActivated: contact.activatedAt !== null,
  };
}

export async function requireClient(): Promise<ClientActor> {
  const client = await getClientActor();
  if (!client) {
    redirect('/portal/sign-in');
  }
  // An invited contact who has not finished setting a password can hold a
  // session but must finish before reaching anything else.
  if (!client.isActivated) {
    redirect('/portal/activate');
  }
  return client;
}

/**
 * Every project read by a client goes through here. Ownership is checked
 * against the contact's own client, so a guessed project id returns nothing
 * rather than someone else's work.
 */
export async function assertClientOwnsProject(
  actor: ClientActor,
  projectId: string,
): Promise<void> {
  const project = await db.project.findFirst({
    where: { id: projectId, clientId: actor.clientId, deletedAt: null },
    select: { id: true },
  });
  if (!project) {
    notFound();
  }
}

export async function recordAudit(options: {
  actorType: ActorType;
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  summary?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const headerList = await headers();
  await db.auditEvent
    .create({
      data: {
        actorType: options.actorType,
        actorId: options.actorId ?? null,
        action: options.action,
        entityType: options.entityType,
        entityId: options.entityId,
        summary: options.summary,
        metadata: options.metadata as never,
        ip:
          headerList.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ??
          headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
          null,
        userAgent: headerList.get('user-agent'),
      },
    })
    .catch((error) => {
      // An audit write must never take down the action it was recording, but a
      // silent failure would be worse than useless, so it is logged loudly.
      console.error('Audit write failed', options.action, error);
    });
}
