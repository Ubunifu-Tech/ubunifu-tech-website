'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { requireClient, recordAudit, type ClientActor } from '@/lib/console/auth';
import { mainContactOf } from '@/lib/console/contacts';
import { renderMarkdown } from '@/lib/console/documents';
import { alertTeam } from '@/lib/console/alerts';
import { consoleEnv } from '@/lib/console/env';
import { documentWordingEmail } from '@/lib/emails';
import { recordSignature } from '@/lib/console/signing';
import { askForFreshCopy, recordDocumentAnswer } from '@/lib/console/document-answers';
import { formText } from '@/lib/console/form';
import { diffParagraphs } from '@/lib/console/diff';

export type SignState = { status: 'idle' | 'done' | 'error'; message?: string };

/** The main contact signs and declines for the client; nobody else. */
async function signerOnly(actor: ClientActor): Promise<string> {
  const main = await mainContactOf(actor.clientId);
  return `${main?.name ?? 'Your main contact'} signs for ${actor.clientName}. Ask them to answer this one.`;
}

/** Signing from the portal, as the person signed in. See recordSignature. */
export async function signDocument(
  _previous: SignState,
  formData: FormData,
): Promise<SignState> {
  const actor = await requireClient();
  if (!actor.isPrimary) return { status: 'error', message: await signerOnly(actor) };
  return recordSignature({
    requestId: String(formData.get('requestId') ?? ''),
    signer: {
      id: actor.id,
      name: actor.name,
      email: actor.email,
      clientId: actor.clientId,
      clientName: actor.clientName,
    },
    initials: String(formData.get('initials') ?? ''),
    acceptedDocument: formData.get('acceptDocument') === 'on',
    acceptedTerms: formData.get('acceptTerms') === 'on',
    via: 'portal',
  });
}

/** Asking for changes, or declining, from the portal. See recordDocumentAnswer. */
export async function respondToDocument(
  _previous: SignState,
  formData: FormData,
): Promise<SignState> {
  const actor = await requireClient();
  if (formText(formData, 'intent') === 'decline' && !actor.isPrimary) {
    return { status: 'error', message: await signerOnly(actor) };
  }
  const answered = await recordDocumentAnswer({
    requestId: String(formData.get('requestId') ?? ''),
    person: {
      id: actor.id,
      name: actor.name,
      email: actor.email,
      clientId: actor.clientId,
      clientName: actor.clientName,
    },
    intent: String(formData.get('intent') ?? ''),
    note: formText(formData, 'note'),
    via: 'portal',
  });
  if (answered.status !== 'done') return answered;
  // Back to the top of the document, where their answer now shows.
  const request = await db.signatureRequest.findFirst({
    where: {
      id: String(formData.get('requestId') ?? ''),
      document: { project: { clientId: actor.clientId } },
    },
    select: { document: { select: { reference: true } } },
  });
  redirect(request ? `/portal/documents/${encodeURIComponent(request.document.reference)}` : '/portal/documents');
}

/** The time to sign ran out: asking us to send it again. */
export async function askForFreshSigningCopy(
  _previous: SignState,
  formData: FormData,
): Promise<SignState> {
  const actor = await requireClient();
  return askForFreshCopy({
    requestId: String(formData.get('requestId') ?? ''),
    person: {
      id: actor.id,
      name: actor.name,
      email: actor.email,
      clientId: actor.clientId,
      clientName: actor.clientName,
    },
    via: 'portal',
  });
}

/** The most a suggested wording may run to. Our longest agreements are a fraction of it. */
const MAX_WORDING = 50_000;

/**
 * Suggesting new wording.
 *
 * For a client who knows exactly what they want it to say: they edit the
 * version they were sent and send the whole text back. It is kept beside the
 * document as a suggestion and never written into it. Staff compare it with
 * what was sent and decide whether the next version starts from it, and the
 * version the client holds stays exactly as it was, so they can still sign it
 * if the conversation ends there.
 *
 * It counts as asking for changes, and is claimed the same way: conditional on
 * the request as it was read, so a double tap cannot record two suggestions or
 * lose one answer under another. Unlike a plain note it can follow one, since
 * "change clause 4" is often followed by "here is how I would put it".
 */
export async function suggestWording(
  _previous: SignState,
  formData: FormData,
): Promise<SignState> {
  const actor = await requireClient();

  const requestId = formText(formData, 'requestId');
  const body = formText(formData, 'body');
  const note = formText(formData, 'note');

  if (body.length === 0) {
    return { status: 'error', message: 'Write your wording in the document above, then send it.' };
  }
  if (body.length > MAX_WORDING) {
    return {
      status: 'error',
      message: 'That is longer than we can take here. Ask for changes instead and tell us what should change.',
    };
  }
  if (note.length > 4000) {
    return { status: 'error', message: 'Your note is longer than this box can take. Keep it to the main points.' };
  }

  const request = await db.signatureRequest.findFirst({
    where: {
      id: requestId,
      // Scoped in the query, so another client's request cannot be answered.
      document: { project: { clientId: actor.clientId, deletedAt: null } },
    },
    select: {
      id: true,
      status: true,
      expiresAt: true,
      respondedAt: true,
      respondedById: true,
      responseNote: true,
      version: { select: { version: true, bodyMarkdown: true } },
      document: {
        select: {
          id: true,
          reference: true,
          title: true,
          status: true,
          project: { select: { slug: true, owner: { select: { email: true, isActive: true, role: true } } } },
        },
      },
    },
  });

  if (!request) return { status: 'error', message: 'That document is not available.' };
  if (request.status === 'signed') {
    return { status: 'error', message: 'This has already been signed.' };
  }
  if (request.status === 'declined') {
    return {
      status: 'error',
      message:
        'You told us you could not sign this version, so it is closed. If that has changed, ask us and we will send it again.',
    };
  }
  if (request.status === 'cancelled') {
    return {
      status: 'error',
      message: 'We withdrew this version, so there is nothing to answer. A newer one should be waiting for you.',
    };
  }
  if (request.status === 'expired' || (request.expiresAt && request.expiresAt.getTime() < Date.now())) {
    return {
      status: 'error',
      message: 'This request has run out. Tell us what you wanted to change and we will send a fresh one.',
    };
  }
  if (
    !['sent', 'viewed'].includes(request.status) ||
    !['sent', 'viewed', 'changes_requested'].includes(request.document.status)
  ) {
    return { status: 'error', message: 'This changed while you were on the page. Refresh to see where it stands.' };
  }

  // Compared block by block on what renders, so the editor tidying the
  // markdown on save does not count as a change they made.
  const parts = diffParagraphs(request.version.bodyMarkdown, body);
  const removed = parts.filter((part) => part.op === 'removed').length;
  const added = parts.filter((part) => part.op === 'added').length;
  if (removed === 0 && added === 0) {
    return {
      status: 'error',
      message: 'That reads the same as the version we sent. Change the wording, then send it.',
    };
  }

  // Pictures cannot come in this way. The editor offers none, so one here was
  // written by hand, and it would load an address of their choosing on our
  // screens and in the next version sent out. Judged on the rendered output,
  // which is the only place the renderer decides what an image is; one that
  // was already in the version we sent is theirs to keep.
  const images = (markdown: string) => new Set(renderMarkdown(markdown).match(/<img\b[^>]*>/g) ?? []);
  const sentImages = images(request.version.bodyMarkdown);
  if ([...images(body)].some((tag) => !sentImages.has(tag))) {
    return {
      status: 'error',
      message: 'Pictures cannot be added here. Describe what you want in words instead.',
    };
  }

  const version = request.version.version;
  const documentId = request.document.id;
  const now = new Date();
  // Added to anything they already said on this version rather than replacing
  // it: an earlier "change clause 4" is still what they asked for.
  const line = `${
    request.respondedById && request.respondedById !== actor.id ? `${actor.name} suggested` : 'Suggested'
  } new wording${note ? `: ${note}` : '.'}`;

  let suggestionId: string;
  try {
    suggestionId = await db.$transaction(async (tx) => {
      const claimed = await tx.signatureRequest.updateMany({
        where: {
          id: request.id,
          status: { in: ['sent', 'viewed'] },
          // The answer as we read it. The note below always changes (the new
          // line is added to it), so a second submission racing this one no
          // longer matches, whether or not anyone had answered before.
          respondedAt: request.respondedAt,
          responseNote: request.responseNote,
        },
        data: {
          // When and by whom changes were first asked for stay as they were:
          // staff read them as "Changes asked for on 1 Sep by A", and a later
          // suggestion from B, or from A again, must not rewrite that.
          respondedAt: request.respondedAt ?? now,
          respondedById: request.respondedById ?? actor.id,
          responseNote: request.responseNote ? `${request.responseNote}\n\n${line}` : line,
        },
      });
      if (claimed.count !== 1) throw new Error('moved-on');

      // One suggestion per version while it is waiting or being used. Once
      // staff set it aside, the client can send another.
      const waiting = await tx.documentSuggestion.count({
        where: { documentId, basedOnVersion: version, status: { in: ['open', 'used'] } },
      });
      if (waiting > 0) throw new Error('already-suggested');

      const created = await tx.documentSuggestion.create({
        data: {
          documentId,
          contactId: actor.id,
          basedOnVersion: version,
          bodyMarkdown: body,
          note: note || null,
          status: 'open',
        },
        select: { id: true },
      });

      await tx.document.updateMany({
        where: { id: documentId, status: { in: ['sent', 'viewed', 'changes_requested'] } },
        data: { status: 'changes_requested' },
      });
      return created.id;
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'already-suggested') {
      return {
        status: 'error',
        message: 'Your suggested wording is already with us. We will send you a new version.',
      };
    }
    if (error instanceof Error && error.message === 'moved-on') {
      // Lost the claim. Most often a second tap on the same button, so say
      // what is true now rather than guess.
      const [current, waiting] = await Promise.all([
        db.signatureRequest.findUnique({ where: { id: request.id }, select: { status: true } }),
        db.documentSuggestion.count({
          where: { documentId, basedOnVersion: version, status: { in: ['open', 'used'] } },
        }),
      ]);
      return {
        status: 'error',
        message:
          current?.status === 'signed'
            ? 'This was signed a moment ago, so there is nothing left to change.'
            : waiting > 0
              ? 'Your suggested wording is already with us. We will send you a new version.'
              : current?.status === 'declined'
                ? 'We already have your answer on this one.'
                : 'This changed while you were on the page. Refresh to see where it stands.',
      };
    }
    throw error;
  }

  // Our alert. The suggestion is already saved, so a failed email costs us
  // promptness and nothing else, and the record below says which it was.
  const sent = await alertTeam({
    owner: request.document.project.owner,
    need: 'documents',
    subject: `[${request.document.reference}] New wording suggested`,
    html: documentWordingEmail({
      reference: request.document.reference,
      title: request.document.title,
      clientName: actor.clientName,
      from: actor.name,
      fromEmail: actor.email,
      note: note || null,
      version,
      removed,
      added,
      url: `${consoleEnv.adminOrigin}/documents/${request.document.reference}`,
    }),
    template: 'document_wording_suggested',
    entityType: 'Document',
    entityId: documentId,
    replyTo: actor.email,
  });

  await recordAudit({
    actorType: 'client_contact',
    actorId: actor.id,
    action: 'document.wording_suggested',
    entityType: 'Document',
    entityId: documentId,
    summary: `${request.document.reference}: ${actor.name} suggested new wording for version ${version}${
      sent.ok ? '' : `. The email to us did not go: ${sent.error}`
    }`,
    metadata: { version, suggestionId, removed, added, note: note || null, emailed: sent.ok },
  });

  revalidatePath('/portal/documents');
  revalidatePath(`/portal/documents/${request.document.reference}`);
  revalidatePath(`/admin/documents/${request.document.reference}`);
  revalidatePath(`/admin/projects/${request.document.project.slug}`);

  // Back to the top of the document, where it now says their wording is
  // with us, rather than leaving them at a form that is no longer there.
  redirect(`/portal/documents/${encodeURIComponent(request.document.reference)}`);
}
