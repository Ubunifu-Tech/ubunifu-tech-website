import 'server-only';
import { createHash } from 'node:crypto';
import { db } from '@/lib/db';
import type { DocumentKind, Prisma } from '@/generated/prisma/client';
import { renderMarkdown } from './markdown';

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
