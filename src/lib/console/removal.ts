import 'server-only';
import { db } from '@/lib/db';
import type { Prisma } from '@/generated/prisma/client';
import { liveInvoice } from './live';
import { formatMoney, numbers } from './money';

/**
 * Removing a client or a project.
 *
 * Removal is a soft delete: deletedAt is set and every row stays, so money,
 * signatures and the activity record remain true. What removal does change is
 * anything still in motion. A document out for signature is withdrawn, the
 * same way withdrawDocument does it for one, so nobody signs something for
 * work that is no longer here. An issued invoice still owed is the one thing
 * that stops a removal: it would vanish from the client's portal and from
 * what we are owed.
 */

/** Waiting on the client: the request and document states a withdrawal undoes. */
const WAITING = ['sent', 'viewed'] as const;

export type WithdrawnDocument = { id: string; reference: string };

/**
 * Withdraws everything out for signature on these projects, inside the
 * caller's transaction. Open requests are cancelled; a document that was out
 * for signature, or sent back with changes asked for, goes back to draft. A
 * signed request or a signed document is never touched: it is the record of
 * what was agreed.
 *
 * Returns the documents that were actually withdrawn, read back after the
 * update, so a request signed in the same moment is not reported as withdrawn.
 */
export async function withdrawOpenSignatures(
  tx: Prisma.TransactionClient,
  projectIds: string[],
): Promise<WithdrawnDocument[]> {
  if (projectIds.length === 0) return [];

  const open = numbers(await tx.signatureRequest.findMany({
    where: { status: { in: [...WAITING] }, document: { projectId: { in: projectIds } } },
    select: { id: true },
  }));
  if (open.length === 0) return [];
  const ids = open.map((request) => request.id);

  await tx.signatureRequest.updateMany({
    where: { id: { in: ids }, status: { in: [...WAITING] } },
    data: { status: 'cancelled' },
  });

  const cancelled = numbers(await tx.signatureRequest.findMany({
    where: { id: { in: ids }, status: 'cancelled' },
    select: { document: { select: { id: true, reference: true } } },
  }));
  const documents = new Map(cancelled.map((request) => [request.document.id, request.document]));
  if (documents.size === 0) return [];

  // Asking for changes leaves the request open, so a document the client has
  // asked to change is withdrawn too, as withdrawDocument does for one.
  await tx.document.updateMany({
    where: { id: { in: [...documents.keys()] }, status: { in: [...WAITING, 'changes_requested'] } },
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
  /** Issued invoices with money still owing, which stop the removal. */
  owing: OwingInvoice[];
};

export type OwingInvoice = {
  number: string;
  currency: string;
  /** What is still owed on it. */
  leftMinor: number;
  /** Money was paid and not refunded, so it cannot be voided as it stands. */
  partPaid: boolean;
};

const OWING = ['sent', 'part_paid', 'overdue'] as const;

/**
 * Issued invoices with money still owing. Removing their project or client
 * would take them out of the client's portal and out of what we are owed,
 * and hide Record a payment, so a removal is refused while any are left
 * (decision 1). The block lives here, not in transitions.ts: it stops a
 * removal, never a stage move.
 */
export async function owingInvoices(
  client: Prisma.TransactionClient | typeof db,
  where: Prisma.InvoiceWhereInput,
): Promise<OwingInvoice[]> {
  const invoices = numbers(await client.invoice.findMany({
    where: { AND: [where, { status: { in: [...OWING] } }] },
    orderBy: { number: 'asc' },
    select: { number: true, totalMinor: true, paidMinor: true, refundedMinor: true, currency: true },
  }));
  return invoices
    .filter((invoice) => invoice.totalMinor > invoice.paidMinor)
    .map((invoice) => ({
      number: invoice.number,
      currency: invoice.currency,
      leftMinor: invoice.totalMinor - invoice.paidMinor,
      partPaid: invoice.paidMinor - invoice.refundedMinor > 0,
    }));
}

/** "INV-1", "INV-1 and INV-2", "INV-1, INV-2 and INV-3". */
function inList(items: string[]): string {
  return items.length < 2 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
}

/**
 * Why a removal cannot go ahead, or null when it can. The same sentence on
 * the confirmation and from the action. Invoice numbers and amounts are
 * named only to someone who handles invoices; anyone else is told who can.
 */
export function owingRefusal(
  owing: OwingInvoice[],
  noun: 'project' | 'client',
  canSeeInvoices: boolean,
): string | null {
  if (owing.length === 0) return null;
  const one = owing.length === 1;
  if (!canSeeInvoices) {
    return one
      ? `This ${noun} has an unpaid invoice. Someone who handles invoices needs to settle or void it before it can be removed.`
      : `This ${noun} has unpaid invoices. Someone who handles invoices needs to settle or void them before it can be removed.`;
  }

  const owed = new Map<string, number>();
  for (const invoice of owing) {
    owed.set(invoice.currency, (owed.get(invoice.currency) ?? 0) + invoice.leftMinor);
  }
  const amount = [...owed].map(([currency, minor]) => formatMoney(minor, currency)).join(' + ');
  const numbers = inList(owing.map((invoice) => invoice.number));
  const sentences = [
    `${numbers} still ${one ? 'has' : 'have'} ${amount} owing.`,
    one
      ? `Record the payment, or void the invoice, before removing this ${noun}.`
      : `Record the payments, or void the invoices, before removing this ${noun}.`,
  ];
  // Voiding is refused while money paid on it is still held.
  const partPaid = owing.filter((invoice) => invoice.partPaid).map((invoice) => invoice.number);
  if (partPaid.length > 0) {
    sentences.push(
      one
        ? 'Refund what was paid, then void it.'
        : `For ${inList(partPaid)}, refund what was paid, then void ${partPaid.length === 1 ? 'it' : 'them'}.`,
    );
  }
  return sentences.join(' ');
}

export type ClientRemovalCounts = RemovalCounts & {
  projects: number;
  /** People who can use the portal now and will not be able to. */
  people: number;
};

/** What removing this client will touch, for the confirmation to say. */
export async function clientRemovalCounts(clientId: string): Promise<ClientRemovalCounts> {
  const onLiveProjects = { project: { clientId, deletedAt: null } } satisfies Prisma.DocumentWhereInput;
  const [projects, people, waiting, signed, invoices, owing] = await Promise.all([
    db.project.count({ where: { clientId, deletedAt: null } }),
    db.clientContact.count({ where: { clientId, deletedAt: null, canSignIn: true } }),
    db.document.count({
      where: { ...onLiveProjects, signatureRequests: { some: { status: { in: [...WAITING] } } } },
    }),
    db.document.count({ where: { ...onLiveProjects, status: 'signed' } }),
    db.invoice.count({ where: { clientId, ...liveInvoice } }),
    owingInvoices(db, { clientId, ...liveInvoice }),
  ]);
  return { projects, people, waiting, signed, invoices, owing };
}

/** What removing this project will touch, for the confirmation to say. */
export async function projectRemovalCounts(projectId: string): Promise<RemovalCounts> {
  const [waiting, signed, invoices, owing] = await Promise.all([
    db.document.count({
      where: { projectId, signatureRequests: { some: { status: { in: [...WAITING] } } } },
    }),
    db.document.count({ where: { projectId, status: 'signed' } }),
    db.invoice.count({ where: { projectId } }),
    owingInvoices(db, { projectId }),
  ]);
  return { waiting, signed, invoices, owing };
}
