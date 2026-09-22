'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireClient, recordAudit } from '@/lib/console/auth';
import { hashDocument } from '@/lib/console/documents';
import { sendConsoleEmail } from '@/lib/console/mailer';
import { consoleEnv } from '@/lib/console/env';
import { documentResponseEmail } from '@/lib/emails';
import { formText } from '@/lib/console/form';

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
    return { status: 'error', message: 'Type your initials: letters only, up to twelve.' };
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
  if (request.status === 'declined') {
    return {
      status: 'error',
      message:
        'You told us you could not sign this version, so it is closed. If that has changed, ask us and we will send it again.',
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
        'This document no longer matches what was sent to you, so it cannot be signed. Nobody has been charged and nothing has been agreed. Please tell us, and we will send a fresh copy.',
    };
  }

  const headerList = await headers();
  const now = new Date();

  /*
   * The claim decides whether a signature happened, so its answer has to reach
   * the code below it. This used to throw on a lost claim and then SWALLOW the
   * throw — after which the function carried on, wrote "document.signed" into
   * the audit trail and told the client "Signed. Thank you". Nothing had been
   * signed: a double tap, or a decline in another tab a moment earlier, lost
   * the claim, and the record then said the opposite of what happened.
   */
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
    return true;
  });

  if (!signed) {
    // Somebody — possibly this same person in another tab — got there first.
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

  return { status: 'done', message: 'Signed. Thank you. We have a copy and so do you.' };
}


/**
 * Not signing.
 *
 * A signing page whose only possible answer is yes is not asking a question.
 * There are two other honest answers and they are different: "change this and
 * send it back" leaves the request open, because the client may still sign it
 * once we have talked; "I cannot sign this" closes the request for good and a
 * new version needs a new one.
 *
 * Both need a reason. A decline with no words attached tells us nothing we can
 * act on, and the note is the entire point of collecting the answer here rather
 * than losing it in somebody's inbox.
 */
export async function respondToDocument(
  _previous: SignState,
  formData: FormData,
): Promise<SignState> {
  const actor = await requireClient();

  const requestId = String(formData.get('requestId') ?? '');
  const intent = String(formData.get('intent') ?? '');
  const note = formText(formData, 'note');

  if (intent !== 'changes' && intent !== 'decline') {
    return { status: 'error', message: 'Choose what you would like to do.' };
  }
  if (note.length < 10) {
    return {
      status: 'error',
      message:
        intent === 'decline'
          ? 'Tell us why, even briefly. We would rather understand than guess.'
          : 'Say what should change. A line is enough.',
    };
  }
  if (note.length > 4000) {
    return { status: 'error', message: 'That is longer than this box can take. Send it as a request instead.' };
  }

  const request = await db.signatureRequest.findFirst({
    where: { id: requestId, document: { project: { clientId: actor.clientId } } },
    select: {
      id: true,
      status: true,
      expiresAt: true,
      respondedAt: true,
      version: { select: { version: true } },
      document: {
        select: {
          id: true,
          reference: true,
          title: true,
          project: { select: { slug: true } },
        },
      },
    },
  });

  if (!request) return { status: 'error', message: 'That document is not available.' };
  if (request.status === 'signed') {
    return { status: 'error', message: 'This has already been signed.' };
  }
  // Each of these used to fall through to one message — "we already have your
  // answer" — including for a request we had WITHDRAWN, where the client had
  // never answered anything. Say which it actually is.
  if (request.status === 'declined' || request.respondedAt) {
    return { status: 'error', message: 'We already have your answer on this one.' };
  }
  if (request.status === 'cancelled') {
    return {
      status: 'error',
      message: 'We withdrew this version, so there is nothing to answer. A newer one should be waiting for you.',
    };
  }
  if (request.expiresAt && request.expiresAt.getTime() < Date.now()) {
    return {
      status: 'error',
      message: 'This request has run out. Tell us what you wanted to say and we will send a fresh one.',
    };
  }

  const now = new Date();
  const declined = intent === 'decline';

  try {
    await db.$transaction(async (tx) => {
      // Conditional on the status we read, for the same reason signing is:
      // two taps must not produce two answers. respondedAt is part of the
      // claim because asking for changes does not move the status — without
      // it, a second answer from another tab matched too and silently
      // replaced the first one's words.
      const claimed = await tx.signatureRequest.updateMany({
        where: { id: request.id, status: { in: ['sent', 'viewed'] }, respondedAt: null },
        data: {
          // Asking for changes leaves it open. The client may still sign this
          // version once we have spoken, and closing it here would force a
          // reissue for a conversation that might end in "actually, it's fine".
          ...(declined ? { status: 'declined' as const } : {}),
          respondedAt: now,
          responseNote: note,
          respondedById: actor.id,
        },
      });
      if (claimed.count !== 1) throw new Error('already-answered');

      await tx.document.update({
        where: { id: request.document.id },
        data: { status: declined ? 'declined' : 'changes_requested' },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'already-answered') {
      // Lost the claim to a change we did not see. Read what it is now.
      const current = await db.signatureRequest.findUnique({
        where: { id: request.id },
        select: { status: true, respondedAt: true },
      });
      return {
        status: 'error',
        message:
          current?.status === 'signed'
            ? 'This was signed a moment ago, so there is nothing left to answer.'
            : current?.respondedAt || current?.status === 'declined'
              ? 'We already have your answer on this one.'
              : 'This changed while you were on the page. Refresh to see where it stands.',
      };
    }
    throw error;
  }

  await recordAudit({
    actorType: 'client_contact',
    actorId: actor.id,
    action: declined ? 'document.declined' : 'document.changes_requested',
    entityType: 'Document',
    entityId: request.document.id,
    summary: declined
      ? `${request.document.reference} declined by ${actor.name}`
      : `${request.document.reference}: ${actor.name} asked for changes`,
    metadata: { version: request.version.version, note },
  });

  // Our own alert. The answer is already recorded, so this failing costs us
  // promptness and nothing else — which is why it is not in the transaction.
  await sendConsoleEmail({
    to: 'info@ubunifutech.com',
    subject: `[${request.document.reference}] ${declined ? 'Declined' : 'Changes requested'}`,
    html: documentResponseEmail({
      reference: request.document.reference,
      title: request.document.title,
      clientName: actor.clientName,
      from: actor.name,
      fromEmail: actor.email,
      declined,
      note,
      version: request.version.version,
      url: `${consoleEnv.adminOrigin}/documents/${request.document.reference}`,
    }),
    template: declined ? 'document_declined' : 'document_changes_requested',
    entityType: 'Document',
    entityId: request.document.id,
  });

  revalidatePath('/portal/documents');
  revalidatePath(`/portal/documents/${request.document.reference}`);
  revalidatePath(`/admin/documents/${request.document.reference}`);
  revalidatePath(`/admin/projects/${request.document.project.slug}`);

  return {
    status: 'done',
    message: declined
      ? 'Recorded. Nothing has been signed and nothing has been charged. We will be in touch.'
      : 'Sent. We will look at it and send you a new version.',
  };
}
