'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { DocumentKind } from '@/generated/prisma/client';
import { requireStaff, recordAudit } from '@/lib/console/auth';
import { consoleEnv } from '@/lib/console/env';
import { issueMagicToken } from '@/lib/console/magic-link';
import { sendConsoleEmail } from '@/lib/console/mailer';
import { documentToSignEmail } from '@/lib/emails';
import {
  DOCUMENT_KIND_LABEL,
  currentTerms,
  hashDocument,
  nextDocumentReference,
} from '@/lib/console/documents';
import { runTurn } from '@/lib/console/agent';
import { COPILOT_SYSTEM, copilotBrief, saveDraftTool } from '@/lib/console/copilot';
import { formText, formTextExact } from '@/lib/console/form';
import { authorText, prepareDocument } from '@/lib/console/document-ready';

export type DocumentState = { status: 'idle' | 'done' | 'error'; message?: string };

/** Creates the document and its first, empty version. */
export async function createDocument(
  _previous: DocumentState,
  formData: FormData,
): Promise<DocumentState> {
  const staff = await requireStaff();

  const projectId = String(formData.get('projectId') ?? '');
  const kindRaw = String(formData.get('kind') ?? '');
  const title = String(formData.get('title') ?? '').trim();

  if (!Object.values(DocumentKind).includes(kindRaw as DocumentKind)) {
    return { status: 'error', message: 'Choose what kind of document this is.' };
  }
  if (title.length < 3 || title.length > 200) {
    return { status: 'error', message: 'Give the document a title.' };
  }

  const project = await db.project.findFirst({
    where: { id: projectId, deletedAt: null },
    select: { id: true, slug: true, name: true },
  });
  if (!project) return { status: 'error', message: 'That project no longer exists.' };

  const kind = kindRaw as DocumentKind;

  const document = await db.$transaction(async (tx) => {
    const reference = await nextDocumentReference(tx, kind);
    return tx.document.create({
      data: {
        projectId: project.id,
        kind,
        title,
        reference,
        versions: {
          create: {
            version: 1,
            bodyMarkdown: '',
            changeNote: 'Created',
            createdById: staff.id,
          },
        },
      },
      select: { id: true, reference: true },
    });
  });

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'document.created',
    entityType: 'Document',
    entityId: document.id,
    summary: `${document.reference}: ${title}`,
  });

  revalidatePath(`/admin/projects/${project.slug}`);
  redirect(`/documents/${document.reference}`);
}

/** Renames a document or changes its kind, up to the moment it is signed. */
export async function saveDetails(
  _previous: DocumentState,
  formData: FormData,
): Promise<DocumentState> {
  const staff = await requireStaff();

  const documentId = formText(formData, 'documentId');
  const title = formText(formData, 'title');
  const kindRaw = formText(formData, 'kind');

  if (!Object.values(DocumentKind).includes(kindRaw as DocumentKind)) {
    return { status: 'error', message: 'Choose what kind of document this is.' };
  }
  if (title.length < 3 || title.length > 200) {
    return { status: 'error', message: 'Give the document a title.' };
  }
  const kind = kindRaw as DocumentKind;

  const document = await db.document.findUnique({
    where: { id: documentId },
    select: { id: true, reference: true, title: true, kind: true, status: true },
  });
  if (!document) return { status: 'error', message: 'That document no longer exists.' };
  if (document.status === 'signed') {
    return { status: 'error', message: 'This has been signed, so it cannot change.' };
  }
  if (document.title === title && document.kind === kind) {
    return { status: 'done', message: 'Nothing changed.' };
  }

  await db.document.update({ where: { id: document.id }, data: { title, kind } });

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'document.details_saved',
    entityType: 'Document',
    entityId: document.id,
    summary:
      document.kind !== kind
        ? `${document.reference}: now ${DOCUMENT_KIND_LABEL[kind].toLowerCase()}`
        : `${document.reference}: renamed to ${title}`,
  });

  revalidatePath(`/admin/documents/${document.reference}`);
  revalidatePath('/admin/documents');
  return { status: 'done', message: 'Saved.' };
}

/**
 * Saves a new version.
 *
 * Always a new row, never an update. A document that has been sent is
 * something somebody is holding, and the only honest way to change it is to
 * produce a revision that sits beside the one they have.
 */
export async function saveVersion(
  _previous: DocumentState,
  formData: FormData,
): Promise<DocumentState> {
  const staff = await requireStaff();

  const documentId = String(formData.get('documentId') ?? '');
  const bodyMarkdown = formTextExact(formData, 'body');
  const changeNote = String(formData.get('changeNote') ?? '').trim();

  if (bodyMarkdown.length > 200_000) {
    return { status: 'error', message: 'That document is too long.' };
  }

  const document = await db.document.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      reference: true,
      status: true,
      versions: {
        orderBy: { version: 'desc' },
        take: 1,
        select: { version: true, bodyMarkdown: true, sourceMarkdown: true },
      },
    },
  });
  if (!document) return { status: 'error', message: 'That document no longer exists.' };
  if (document.status === 'signed') {
    return { status: 'error', message: 'This has been signed. A signed document cannot be edited.' };
  }

  // Compared with what the author last wrote, not with the sent copy that has
  // the fee table filled in, or every save after a send would look like a change.
  const latest = document.versions[0];
  const then = formText(formData, 'then');
  const next = then === 'review' ? `/documents/${document.reference}?step=review` : null;

  if (latest && authorText(latest) === bodyMarkdown) {
    if (next) redirect(next);
    return { status: 'done', message: 'Nothing changed.' };
  }

  const version = (latest?.version ?? 0) + 1;
  await db.documentVersion.create({
    data: {
      documentId: document.id,
      version,
      bodyMarkdown,
      changeNote: changeNote || null,
      createdById: staff.id,
    },
  });

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'document.version_saved',
    entityType: 'Document',
    entityId: document.id,
    summary: `${document.reference}, version ${version}${changeNote ? `: ${changeNote}` : ''}`,
  });

  revalidatePath(`/admin/documents/${document.reference}`);
  if (next) redirect(next);
  return { status: 'done', message: `Saved as version ${version}.` };
}

/**
 * One turn of the drafting conversation.
 *
 * Not a one-shot any more. The thread lives in the database, so a staff member
 * can say "make the payment two stages" and be understood, come back tomorrow
 * and carry on, and read afterwards exactly what was asked for and what the
 * model did about it. The system prompt and the project brief are cached, so
 * every turn after the first pays for the new message rather than the whole
 * context again.
 */
export async function askCopilot(
  _previous: DocumentState,
  formData: FormData,
): Promise<DocumentState> {
  const staff = await requireStaff();

  const documentId = String(formData.get('documentId') ?? '');
  const message = formText(formData, 'message');

  if (message.length < 2 || message.length > 4000) {
    return { status: 'error', message: 'Say what you would like.' };
  }

  const document = await db.document.findUnique({
    where: { id: documentId },
    select: { id: true, reference: true, status: true },
  });
  if (!document) return { status: 'error', message: 'That document no longer exists.' };
  if (document.status === 'signed') {
    return {
      status: 'error',
      message: 'This has been signed, so it cannot be redrafted. Start a change order instead.',
    };
  }

  // One thread per document, created on first use.
  const existing = await db.conversation.findFirst({
    where: { documentId: document.id, kind: 'document_draft' },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });

  const conversationId =
    existing?.id ??
    (
      await db.conversation.create({
        data: {
          kind: 'document_draft',
          documentId: document.id,
          actorType: 'staff',
          actorId: staff.id,
          title: `Drafting ${document.reference}`,
        },
        select: { id: true },
      })
    ).id;

  const brief = await copilotBrief(document.id);

  const result = await runTurn({
    conversationId,
    kind: 'document_draft',
    system: COPILOT_SYSTEM,
    brief: brief ?? undefined,
    userMessage: message,
    tools: [saveDraftTool],
    context: { documentId: document.id, staffId: staff.id },
    maxTokens: 32000,
  });

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: result.ok ? 'document.copilot_turn' : 'document.copilot_failed',
    entityType: 'Document',
    entityId: document.id,
    summary: result.ok
      ? `${document.reference}: ${result.usedTools.length > 0 ? 'wrote a version' : 'answered'}`
      : `${document.reference}: ${result.error}`,
  });

  revalidatePath(`/admin/documents/${document.reference}`);

  if (!result.ok) return { status: 'error', message: result.error };
  return { status: 'done', message: result.reply };
}

/**
 * Sends the document for signature.
 *
 * The fee table is filled in from the project's fees here, and the result is
 * saved as its own version, so the text the client signs, and the fingerprint
 * of it, include the exact amounts. Three things are then pinned and never
 * move again: that version, a SHA-256 of how it renders, and the terms in
 * force. The hash is recomputed when somebody signs and compared with this
 * one; that comparison is the whole proof.
 */
export async function sendForSignature(
  _previous: DocumentState,
  formData: FormData,
): Promise<DocumentState> {
  const staff = await requireStaff();
  const documentId = String(formData.get('documentId') ?? '');

  const document = await db.document.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      reference: true,
      title: true,
      kind: true,
      status: true,
      versions: {
        orderBy: { version: 'desc' },
        take: 1,
        select: { id: true, version: true, bodyMarkdown: true, sourceMarkdown: true },
      },
      project: {
        select: {
          id: true,
          name: true,
          slug: true,
          currency: true,
          client: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  });

  if (!document) return { status: 'error', message: 'That document no longer exists.' };
  if (document.status === 'signed') {
    return { status: 'error', message: 'This has already been signed.' };
  }

  const latest = document.versions[0];
  if (!latest) {
    return { status: 'error', message: 'There is nothing to send. Write the document first.' };
  }

  const prepared = await prepareDocument({
    kind: document.kind,
    source: authorText(latest),
    project: {
      id: document.project.id,
      currency: document.project.currency,
      clientId: document.project.client.id,
      clientSlug: document.project.client.slug,
    },
  });

  const failing = prepared.checks.find((check) => !check.ok);
  if (failing || !prepared.signer) {
    return {
      status: 'error',
      message: failing?.problem ?? 'The client has no main contact yet.',
    };
  }
  const contact = prepared.signer;

  const terms = await currentTerms();
  const documentHash = hashDocument(prepared.final);

  const request = await db.$transaction(async (tx) => {
    // The copy with the fees filled in is a version of its own, unless the
    // latest already is exactly that.
    const version =
      latest.bodyMarkdown === prepared.final
        ? latest
        : await tx.documentVersion.create({
            data: {
              documentId: document.id,
              version: latest.version + 1,
              bodyMarkdown: prepared.final,
              sourceMarkdown: prepared.source,
              changeNote: 'Fees filled in for sending',
              createdById: staff.id,
            },
            select: { id: true, version: true },
          });

    // Any earlier request is withdrawn, so a client cannot sign a version we
    // have moved on from.
    await tx.signatureRequest.updateMany({
      where: { documentId: document.id, status: { in: ['draft', 'sent', 'viewed'] } },
      data: { status: 'cancelled' },
    });

    const created = await tx.signatureRequest.create({
      data: {
        documentId: document.id,
        versionId: version.id,
        status: 'sent',
        documentHash,
        termsVersionId: terms?.id ?? null,
        sentAt: new Date(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      },
      select: { id: true },
    });

    await tx.document.update({
      where: { id: document.id },
      data: { status: 'sent' },
    });

    return { id: created.id, version: version.version };
  });

  const { token } = await issueMagicToken({
    purpose: 'document_access',
    actorType: 'client_contact',
    actorId: contact.id,
    entityType: 'SignatureRequest',
    entityId: request.id,
  });

  const sent = await sendConsoleEmail({
    to: contact.email,
    subject: `${document.title}: ready for your signature`,
    html: documentToSignEmail({
      name: contact.name,
      clientName: document.project.client.name,
      documentTitle: document.title,
      kind: DOCUMENT_KIND_LABEL[document.kind],
      reference: document.reference,
      termsTitle: terms?.title ?? null,
      url: `${consoleEnv.publicOrigin}/portal/sign-in/verify?token=${encodeURIComponent(token)}`,
    }),
    template: 'document_to_sign',
    entityType: 'Document',
    entityId: document.id,
  });

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: sent.ok ? 'document.sent' : 'document.send_failed',
    entityType: 'Document',
    entityId: document.id,
    summary: sent.ok
      ? `${document.reference} version ${request.version} to ${contact.email}`
      : `${document.reference}: could not send to ${contact.email}: ${sent.error}`,
    metadata: { documentHash, version: request.version },
  });

  revalidatePath(`/admin/documents/${document.reference}`);
  revalidatePath(`/admin/projects/${document.project.slug}`);

  if (!sent.ok) {
    return {
      status: 'error',
      message: `It is waiting in their portal, but the email did not go: ${sent.error}`,
    };
  }
  return { status: 'done', message: `Sent to ${contact.name} (${contact.email}).` };
}
