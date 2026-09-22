'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireClient, recordAudit } from '@/lib/console/auth';
import { hashDocument } from '@/lib/console/documents';

export type SignState = { status: 'idle' | 'done' | 'error'; message?: string };

/**
 * Signing.
 *
 * Initials plus an explicit acceptance of a named, versioned set of terms.
 * There is no third party holding a copy, so the record has to carry its own
 * evidence: the version is pinned, the hash of how that version rendered is
 * recomputed here and compared with the one sealed in when it was sent, and the
 * whole thing is refused on a mismatch. A mismatch means the document changed
 * underneath the person about to sign it, which is the one failure this design
 * exists to make impossible to miss.
 */
export async function signDocument(
  _previous: SignState,
  formData: FormData,
): Promise<SignState> {
  const actor = await requireClient();

  const requestId = String(formData.get('requestId') ?? '');
  const initials = String(formData.get('initials') ?? '').trim();
  const acceptedTerms = formData.get('acceptTerms') === 'on';
  const acceptedDocument = formData.get('acceptDocument') === 'on';

  if (!/^[\p{L}][\p{L}.\s'-]{0,11}$/u.test(initials)) {
    return { status: 'error', message: 'Type your initials — letters only, up to twelve.' };
  }
  if (!acceptedDocument) {
    return { status: 'error', message: 'Tick the box to confirm you have read it.' };
  }

  const request = await db.signatureRequest.findFirst({
    where: {
      id: requestId,
      // Scoped in the query: a request belonging to another client does not
      // match, so a guessed id is indistinguishable from one that never existed.
      document: { project: { clientId: actor.clientId } },
    },
    select: {
      id: true,
      status: true,
      documentHash: true,
      expiresAt: true,
      termsVersionId: true,
      version: { select: { id: true, bodyMarkdown: true, version: true } },
      document: {
        select: { id: true, reference: true, title: true, project: { select: { slug: true } } },
      },
    },
  });

  if (!request) return { status: 'error', message: 'That document is not available to sign.' };
  if (request.status === 'signed') {
    return { status: 'error', message: 'This has already been signed.' };
  }
  if (request.status === 'cancelled') {
    return {
      status: 'error',
      message: 'This version was withdrawn. A newer one should be waiting for you.',
    };
  }
  if (request.expiresAt && request.expiresAt.getTime() < Date.now()) {
    return { status: 'error', message: 'This signing request has expired. Ask us to send it again.' };
  }
  if (request.termsVersionId && !acceptedTerms) {
    return { status: 'error', message: 'Tick the box to accept the terms of engagement.' };
  }

  // The proof.
  const hashNow = hashDocument(request.version.bodyMarkdown);
  if (hashNow !== request.documentHash) {
    await recordAudit({
      actorType: 'system',
      action: 'document.hash_mismatch',
      entityType: 'SignatureRequest',
      entityId: request.id,
      summary: `Refused to record a signature on ${request.document.reference}: the document does not match what was sent`,
      metadata: { sealed: request.documentHash, now: hashNow },
    });
    return {
      status: 'error',
      message:
        'This document no longer matches what was sent to you, so it cannot be signed. Nobody has been charged and nothing has been agreed — please tell us, and we will send a fresh copy.',
    };
  }

  const headerList = await headers();
  const now = new Date();

  await db.$transaction(async (tx) => {
    // Conditional on the status we read, so two taps on a phone cannot record
    // two signatures against one request.
    const claimed = await tx.signatureRequest.updateMany({
      where: { id: request.id, status: { in: ['sent', 'viewed'] } },
      data: { status: 'signed' },
    });
    if (claimed.count !== 1) throw new Error('already-signed');

    await tx.signature.create({
      data: {
        requestId: request.id,
        contactId: actor.id,
        signerName: actor.name,
        signerEmail: actor.email,
        method: 'initials',
        initials,
        termsVersionId: request.termsVersionId,
        termsAcceptedAt: request.termsVersionId ? now : null,
        documentHash: hashNow,
        ip:
          headerList.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ??
          headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
          null,
        userAgent: headerList.get('user-agent'),
        signedAt: now,
      },
    });

    await tx.document.update({
      where: { id: request.document.id },
      data: { status: 'signed' },
    });
  }).catch((error: unknown) => {
    if (error instanceof Error && error.message === 'already-signed') return;
    throw error;
  });

  await recordAudit({
    actorType: 'client_contact',
    actorId: actor.id,
    action: 'document.signed',
    entityType: 'Document',
    entityId: request.document.id,
    summary: `${request.document.reference} signed by ${actor.name} as "${initials}"`,
    metadata: { version: request.version.version, documentHash: hashNow },
  });

  revalidatePath('/portal/documents');
  revalidatePath(`/admin/documents/${request.document.reference}`);
  revalidatePath(`/admin/projects/${request.document.project.slug}`);

  return { status: 'done', message: 'Signed. Thank you — we have a copy and so do you.' };
}

/** Records that the client opened it, once. */
export async function markViewed(requestId: string): Promise<void> {
  await db.signatureRequest.updateMany({
    where: { id: requestId, status: 'sent' },
    data: { status: 'viewed', viewedAt: new Date() },
  });
}
