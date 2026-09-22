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
    summary: `${document.reference} — ${title}`,
  });

  revalidatePath(`/admin/projects/${project.slug}`);
  redirect(`/documents/${document.reference}`);
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
  const bodyMarkdown = String(formData.get('body') ?? '');
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
      versions: { orderBy: { version: 'desc' }, take: 1, select: { version: true, bodyMarkdown: true } },
    },
  });
  if (!document) return { status: 'error', message: 'That document no longer exists.' };
  if (document.status === 'signed') {
    return { status: 'error', message: 'This has been signed. A signed document cannot be edited.' };
  }

  const latest = document.versions[0];
  if (latest && latest.bodyMarkdown === bodyMarkdown) {
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
    summary: `${document.reference} — version ${version}${changeNote ? `: ${changeNote}` : ''}`,
  });

  revalidatePath(`/admin/documents/${document.reference}`);
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
  const message = String(formData.get('message') ?? '').trim();

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
      message: 'This has been signed. A signed document cannot be redrafted — raise a change order.',
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
      ? `${document.reference} — ${result.usedTools.length > 0 ? 'wrote a version' : 'answered'}`
      : `${document.reference} — ${result.error}`,
  });

  revalidatePath(`/admin/documents/${document.reference}`);

  if (!result.ok) return { status: 'error', message: result.error };
  return { status: 'done', message: result.reply };
}

/**
 * Sends the latest version for signature.
 *
 * Three things are pinned at this moment and never move again: the version, a
 * SHA-256 of how it renders, and the terms in force. The hash is recomputed
 * when somebody signs and compared with this one — that comparison is the whole
 * proof, because there is no third party here to hold a copy.
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
        select: { id: true, version: true, bodyMarkdown: true },
      },
      project: {
        select: {
          name: true,
          slug: true,
          client: {
            select: {
              name: true,
              contacts: {
                where: { deletedAt: null, canSignIn: true, isPrimary: true },
                select: { id: true, name: true, email: true },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  if (!document) return { status: 'error', message: 'That document no longer exists.' };
  if (document.status === 'signed') {
    return { status: 'error', message: 'This has already been signed.' };
  }

  const version = document.versions[0];
  if (!version || version.bodyMarkdown.trim().length < 40) {
    return { status: 'error', message: 'There is nothing to send. Write the document first.' };
  }
  if (version.bodyMarkdown.includes('[TO CONFIRM')) {
    return {
      status: 'error',
      message:
        'This still has TO CONFIRM markers in it. Those are the assistant telling you something is missing — fill them in before it goes out.',
    };
  }

  const contact = document.project.client.contacts[0];
  if (!contact) {
    return {
      status: 'error',
      message: 'This client has no main contact who can sign in. Add one first.',
    };
  }

  const terms = await currentTerms();
  const documentHash = hashDocument(version.bodyMarkdown);

  const request = await db.$transaction(async (tx) => {
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

    return created;
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
    subject: `${document.title} — ready for your signature`,
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
      ? `${document.reference} version ${version.version} to ${contact.email}`
      : `${document.reference} — could not send to ${contact.email}: ${sent.error}`,
    metadata: { documentHash, version: version.version },
  });

  revalidatePath(`/admin/documents/${document.reference}`);
  revalidatePath(`/admin/projects/${document.project.slug}`);

  if (!sent.ok) {
    return {
      status: 'error',
      message: `It is waiting in their portal and the attempt is logged, but the email did not go: ${sent.error}`,
    };
  }
  return { status: 'done', message: `Sent to ${contact.email}. It is version ${version.version}.` };
}
