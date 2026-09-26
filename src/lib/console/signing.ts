import 'server-only';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import type { ProjectStatus } from '@/generated/prisma/client';
import { recordAudit } from './auth';
import { DOCUMENT_KIND_LABEL, hashDocument } from './documents';
import { consoleEnv } from './env';
import { sendConsoleEmail } from './mailer';
import { formatDate } from './money';
import { STAFF_LABEL } from './project-status';
import { advanceForDocument } from './transitions';
import { alertTeam } from './alerts';
import { documentSignedEmail, documentSignedNoticeEmail } from '@/lib/emails';

export type SignOutcome = { status: 'done' | 'error'; message: string };

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
 *
 * The same for someone signed in to the portal and for someone who opened a
 * link shared by hand: who signs is decided by the caller (the session, or
 * the person the link was made for), and the record says which way it came.
 */
export async function recordSignature(input: {
  requestId: string;
  signer: { id: string; name: string; email: string | null; clientId: string; clientName: string };
  initials: string;
  acceptedDocument: boolean;
  acceptedTerms: boolean;
  via: 'portal' | 'shared_link';
}): Promise<SignOutcome> {
  const { signer } = input;
  const initials = input.initials.trim();

  if (!/^[\p{L}][\p{L}.\s'-]{0,11}$/u.test(initials)) {
    return { status: 'error', message: 'Type your initials: letters only, up to twelve.' };
  }
  if (!input.acceptedDocument) {
    return { status: 'error', message: 'Tick the box to confirm you have read it.' };
  }

  const request = await db.signatureRequest.findFirst({
    where: {
      id: input.requestId,
      // Scoped in the query: a request belonging to another client does not
      // match, so a guessed id is indistinguishable from one that never existed.
      document: { project: { clientId: signer.clientId, deletedAt: null } },
    },
    select: {
      id: true,
      status: true,
      documentHash: true,
      expiresAt: true,
      termsVersionId: true,
      version: { select: { id: true, bodyMarkdown: true, version: true } },
      document: {
        select: {
          id: true,
          reference: true,
          title: true,
          kind: true,
          project: {
            select: { id: true, slug: true, owner: { select: { email: true, isActive: true } } },
          },
        },
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
  if (request.status === 'declined') {
    return {
      status: 'error',
      message:
        'You told us you could not sign this version, so it is closed. If that has changed, ask us and we will send it again.',
    };
  }
  if (request.expiresAt && request.expiresAt.getTime() < Date.now()) {
    return {
      status: 'error',
      message: 'This signing request has expired. Ask us to send it again.',
    };
  }
  if (request.termsVersionId && !input.acceptedTerms) {
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
        'This document no longer matches what was sent to you, so it cannot be signed. Nobody has been charged and nothing has been agreed. Please tell us, and we will send a fresh copy.',
    };
  }

  const headerList = await headers();
  const now = new Date();

  /*
   * The claim decides whether a signature happened, so its answer has to reach
   * the code below it. A lost claim (a double tap, or a decline in another tab
   * a moment earlier) must end here, not carry on and record a signature that
   * did not happen.
   */
  // Set inside the transaction below; the cast stops TypeScript assuming it
  // stays null, since it cannot see assignments made in a callback.
  let moved = null as { from: ProjectStatus; to: ProjectStatus } | null;
  const signed = await db.$transaction(async (tx) => {
    // Conditional on the status we read, so two taps on a phone cannot record
    // two signatures against one request.
    const claimed = await tx.signatureRequest.updateMany({
      where: { id: request.id, status: { in: ['sent', 'viewed'] } },
      data: { status: 'signed' },
    });
    if (claimed.count !== 1) return false;

    await tx.signature.create({
      data: {
        requestId: request.id,
        contactId: signer.id,
        signerName: signer.name,
        signerEmail: signer.email,
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

    // A signed proposal or agreement moves the project on to match, in the
    // same transaction, so the two can never disagree.
    moved = await advanceForDocument(tx, {
      projectId: request.document.project.id,
      kind: request.document.kind,
      milestone: 'signed',
      reference: request.document.reference,
      actorType: 'client_contact',
      actorId: signer.id,
    });
    return true;
  });

  if (!signed) {
    // Somebody, possibly this same person in another tab, got there first.
    // Say what the request is now rather than guess.
    const current = await db.signatureRequest.findUnique({
      where: { id: request.id },
      select: { status: true },
    });
    return {
      status: 'error',
      message:
        current?.status === 'signed'
          ? 'This has already been signed. Your copy is on this page.'
          : 'This could not be signed because it changed while you were on the page. Refresh to see where it stands.',
    };
  }

  const byLink = input.via === 'shared_link';
  await recordAudit({
    actorType: 'client_contact',
    actorId: signer.id,
    action: 'document.signed',
    entityType: 'Document',
    entityId: request.document.id,
    summary: `${request.document.reference} signed by ${signer.name} as "${initials}"${
      byLink ? ', through a link shared by hand' : ''
    }`,
    metadata: { version: request.version.version, documentHash: hashNow, via: input.via },
  });

  if (moved) {
    await recordAudit({
      actorType: 'client_contact',
      actorId: signer.id,
      action: 'project.status_changed',
      entityType: 'Project',
      entityId: request.document.project.id,
      summary: `${moved.from} → ${moved.to}, when ${request.document.reference} was signed`,
    });
  }

  // Their copy, and our notice. Both after the signature is safely recorded:
  // an email that fails costs promptness, never the signature.
  const kindLabel = DOCUMENT_KIND_LABEL[request.document.kind];
  const copy = signer.email
    ? await sendConsoleEmail({
        to: signer.email,
        subject: `Signed: ${request.document.title}`,
        html: documentSignedEmail({
          name: signer.name,
          clientName: signer.clientName,
          documentTitle: request.document.title,
          kind: kindLabel,
          reference: request.document.reference,
          initials,
          signedOn: formatDate(now),
          fingerprint: `${hashNow.slice(0, 8)}…${hashNow.slice(-8)}`,
          url: `${consoleEnv.publicOrigin}/portal/documents/${request.document.reference}`,
        }),
        template: 'document_signed_copy',
        entityType: 'Document',
        entityId: request.document.id,
      })
    : null;
  await alertTeam({
    owner: request.document.project.owner,
    subject: `[${request.document.reference}] Signed by ${signer.name}`,
    html: documentSignedNoticeEmail({
      reference: request.document.reference,
      title: request.document.title,
      clientName: signer.clientName,
      from: signer.name,
      fromEmail: signer.email ?? 'no email, signed through a shared link',
      version: request.version.version,
      projectMoved: moved ? STAFF_LABEL[moved.to].toLowerCase() : null,
      url: `${consoleEnv.adminOrigin}/documents/${request.document.reference}`,
    }),
    template: 'document_signed_notice',
    entityType: 'Document',
    entityId: request.document.id,
    replyTo: signer.email,
  });

  if (copy && !copy.ok) {
    // The signature stands either way; this is so we know to send their copy.
    await recordAudit({
      actorType: 'system',
      action: 'document.signed_copy.send_failed',
      entityType: 'Document',
      entityId: request.document.id,
      summary: `${request.document.reference}: could not email the signed copy to ${signer.email}: ${copy.error}`,
    });
  }

  revalidatePath('/portal/documents');
  revalidatePath('/portal', 'layout');
  revalidatePath(`/admin/documents/${request.document.reference}`);
  revalidatePath(`/admin/projects/${request.document.project.slug}`);

  if (!copy) {
    return {
      status: 'done',
      message: 'Signed. Thank you. Save a copy as a PDF from this page for your records.',
    };
  }
  return {
    status: 'done',
    message: copy.ok
      ? byLink
        ? 'Signed. Thank you. A copy is on its way to your email.'
        : 'Signed. Thank you. A copy is on its way to your email, and it stays here.'
      : 'Signed. Thank you. We could not email your copy just now. Save it as a PDF from this page.',
  };
}
