import 'server-only';
import { createHash } from 'node:crypto';
import { db } from '@/lib/db';
import type { DocumentKind, Prisma } from '@/generated/prisma/client';
import { renderMarkdown } from './markdown';
import { formatShortDate } from './money';

/**
 * Documents, versions and the hash that makes a signature mean something.
 *
 * The rule the whole thing rests on: a signature is pinned to one version, and
 * the SHA-256 of that version's rendered body is stored on the request when it
 * is sent and recomputed at the moment of signing. If the two differ, the
 * document changed underneath the signer and the signature is refused. That
 * comparison is the proof — there is no third party here, so the record has to
 * carry its own evidence.
 */

const PREFIX: Record<DocumentKind, string> = {
  proposal: 'PRO',
  contract: 'AGR',
  change_order: 'CHG',
  statement_of_work: 'SOW',
  handover: 'HND',
  other: 'DOC',
};

export const DOCUMENT_KIND_LABEL: Record<DocumentKind, string> = {
  proposal: 'Proposal',
  contract: 'Agreement',
  change_order: 'Change order',
  statement_of_work: 'Statement of work',
  handover: 'Handover pack',
  other: 'Document',
};

export const DOCUMENT_STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  internal_review: 'Internal review',
  sent: 'With the client',
  viewed: 'Opened by the client',
  changes_requested: 'Changes requested',
  signed: 'Signed',
  declined: 'Declined',
  expired: 'Expired',
  superseded: 'Superseded',
};

/**
 * The same states, said to the person they are about.
 *
 * "With the client" and "Opened by the client" are how we talk about a
 * document among ourselves; showing either of them to the client is talking
 * about somebody in the third person while they are standing there.
 */
export const PORTAL_DOCUMENT_STATUS_LABEL: Record<string, string> = {
  sent: 'Waiting for your signature',
  viewed: 'Waiting for your signature',
  changes_requested: 'You asked for changes',
  signed: 'Signed',
  declined: 'You declined this',
  expired: 'Expired',
  superseded: 'Replaced by a newer version',
};

/** The latest request on a document sent to the client, as the portal reads it. */
export type PortalRequest = {
  status: string;
  expiresAt: Date | null;
  respondedAt: Date | null;
  respondedBy?: { id: string; name: string } | null;
  signatures: { signedAt: Date }[];
};

/** Who is looking, and whether they are the one who signs for the client. */
export type PortalViewer = { id: string; signs: boolean; signerName: string | null };

/**
 * A document's state as the person looking at it would put it: signed,
 * waiting for them, with their main contact to sign, or back with us for one
 * reason or another, naming a colleague when it was a colleague who answered.
 * `waiting` is true only when the next move is theirs.
 */
export function portalDocumentState(
  status: string,
  request: PortalRequest | undefined,
  viewer: PortalViewer,
  now: Date,
): { label: string; tone: 'good' | 'bad' | 'warn' | 'live'; waiting: boolean } {
  const viewerId = viewer.id;
  if (!request) return { label: 'Being revised', tone: 'live', waiting: false };
  const signature = request.signatures[0];
  if (signature) return { label: `Signed ${formatShortDate(signature.signedAt)}`, tone: 'good', waiting: false };
  // Named when we know who answered; "you" only when it was them.
  const who = request.respondedBy
    ? request.respondedBy.id === viewerId
      ? 'You'
      : request.respondedBy.name
    : null;
  if (request.status === 'declined') {
    return { label: who ? `${who} declined this` : 'Declined', tone: 'bad', waiting: false };
  }
  if (request.expiresAt && request.expiresAt.getTime() < now.getTime()) {
    return { label: 'Time to sign ran out', tone: 'warn', waiting: false };
  }
  if (request.respondedAt) {
    return { label: who ? `${who} asked for changes` : 'Changes asked for', tone: 'live', waiting: false };
  }
  if (!viewer.signs) {
    return { label: `With ${viewer.signerName ?? 'your main contact'} to sign`, tone: 'live', waiting: false };
  }
  return { label: PORTAL_DOCUMENT_STATUS_LABEL[status] ?? 'Waiting for your signature', tone: 'warn', waiting: true };
}

/** AGR-2026-004. Per kind, per year, derived from the highest already issued. */
export async function nextDocumentReference(
  tx: Prisma.TransactionClient,
  kind: DocumentKind,
  now = new Date(),
): Promise<string> {
  const prefix = `${PREFIX[kind]}-${now.getFullYear()}-`;
  const latest = await tx.document.findFirst({
    where: { reference: { startsWith: prefix } },
    orderBy: { reference: 'desc' },
    select: { reference: true },
  });
  const previous = latest ? Number.parseInt(latest.reference.slice(prefix.length), 10) : 0;
  const next = Number.isFinite(previous) ? previous + 1 : 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

/**
 * The hash that gets sealed into a signature request.
 *
 * Taken over the RENDERED html rather than the markdown source, because what a
 * signer agreed to is what they were shown. Two different markdown inputs that
 * render identically are the same document as far as the signer is concerned,
 * and a whitespace edit that changes nothing on screen should not invalidate a
 * signature.
 */
export function hashDocument(bodyMarkdown: string): string {
  return createHash('sha256').update(renderMarkdown(bodyMarkdown), 'utf8').digest('hex');
}

/** Short form, for showing a hash to a person without a wall of hex. */
export function shortHash(hash: string): string {
  return `${hash.slice(0, 8)}…${hash.slice(-8)}`;
}

/** The terms in force, pinned onto anything sent for signature. */
export async function currentTerms() {
  return db.termsVersion.findFirst({
    where: { isCurrent: true },
    select: { id: true, version: true, title: true, bodyMarkdown: true, effectiveFrom: true },
  });
}

export { renderMarkdown };

/**
 * Records that the client opened a signing request, once.
 *
 * NOT a server action, and it used to be one. Living in a 'use server' file
 * made it a public endpoint: anyone with a request id could POST to it, signed
 * in or not, and move another client's contract from "sent" to "opened" — which
 * is the fact staff read before deciding whether to chase. It is only ever
 * called from the portal page, after that page's own query has already
 * established the request belongs to the reader, so the check lives there and
 * this is plain server code nobody can reach from outside.
 */
export async function markSignatureRequestViewed(requestId: string): Promise<void> {
  await db.signatureRequest.updateMany({
    where: { id: requestId, status: 'sent' },
    data: { status: 'viewed', viewedAt: new Date() },
  });
}
