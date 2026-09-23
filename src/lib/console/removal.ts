import 'server-only';
import { db } from '@/lib/db';
import type { Prisma } from '@/generated/prisma/client';
import { liveInvoice } from './live';

/**
 * Removing a client or a project.
 *
 * Removal is a soft delete: deletedAt is set and every row stays, so money,
 * signatures and the activity record remain true. What removal does change is
 * anything still in motion. A document out for signature is withdrawn, the
 * same way withdrawDocument does it for one, so nobody signs something for
 * work that is no longer here.
 */

/** Waiting on the client: the request and document states a withdrawal undoes. */
const WAITING = ['sent', 'viewed'] as const;

export type WithdrawnDocument = { id: string; reference: string };

/**
 * Withdraws everything out for signature on these projects, inside the
 * caller's transaction. Open requests are cancelled; a document that was out
 * for signature goes back to draft. A signed request or a signed document is
 * never touched: it is the record of what was agreed.
 *
 * Returns the documents that were actually withdrawn, read back after the
 * update, so a request signed in the same moment is not reported as withdrawn.
 */
export async function withdrawOpenSignatures(
  tx: Prisma.TransactionClient,
  projectIds: string[],
): Promise<WithdrawnDocument[]> {
  if (projectIds.length === 0) return [];

  const open = await tx.signatureRequest.findMany({
    where: { status: { in: [...WAITING] }, document: { projectId: { in: projectIds } } },
    select: { id: true },
  });
  if (open.length === 0) return [];
  const ids = open.map((request) => request.id);

  await tx.signatureRequest.updateMany({
    where: { id: { in: ids }, status: { in: [...WAITING] } },
    data: { status: 'cancelled' },
  });

  const cancelled = await tx.signatureRequest.findMany({
    where: { id: { in: ids }, status: 'cancelled' },
    select: { document: { select: { id: true, reference: true } } },
  });
  const documents = new Map(cancelled.map((request) => [request.document.id, request.document]));
  if (documents.size === 0) return [];

  await tx.document.updateMany({
    where: { id: { in: [...documents.keys()] }, status: { in: [...WAITING] } },
    data: { status: 'draft' },
  });

  return [...documents.values()];
}

export type RemovalCounts = {
  /** Documents out for signature, which will be withdrawn. */
  waiting: number;
  /** Signed documents, which stay on record. */
  signed: number;
  /** Invoices, which stay on record. */
  invoices: number;
};

export type ClientRemovalCounts = RemovalCounts & {
  projects: number;
  /** People who can use the portal now and will not be able to. */
  people: number;
};

/** What removing this client will touch, for the confirmation to say. */
export async function clientRemovalCounts(clientId: string): Promise<ClientRemovalCounts> {
  const onLiveProjects = { project: { clientId, deletedAt: null } } satisfies Prisma.DocumentWhereInput;
  const [projects, people, waiting, signed, invoices] = await Promise.all([
    db.project.count({ where: { clientId, deletedAt: null } }),
    db.clientContact.count({ where: { clientId, deletedAt: null, canSignIn: true } }),
    db.document.count({
      where: { ...onLiveProjects, signatureRequests: { some: { status: { in: [...WAITING] } } } },
    }),
    db.document.count({ where: { ...onLiveProjects, status: 'signed' } }),
    db.invoice.count({ where: { clientId, ...liveInvoice } }),
  ]);
  return { projects, people, waiting, signed, invoices };
}

/** What removing this project will touch, for the confirmation to say. */
export async function projectRemovalCounts(projectId: string): Promise<RemovalCounts> {
  const [waiting, signed, invoices] = await Promise.all([
    db.document.count({
      where: { projectId, signatureRequests: { some: { status: { in: [...WAITING] } } } },
    }),
    db.document.count({ where: { projectId, status: 'signed' } }),
    db.invoice.count({ where: { projectId } }),
  ]);
  return { waiting, signed, invoices };
}
