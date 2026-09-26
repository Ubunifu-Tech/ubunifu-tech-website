'use server';

import { NO_PERMISSION } from '@/lib/console/permissions';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { advanceForDocument } from '@/lib/console/transitions';
import { DocumentKind, type ProjectStatus } from '@/generated/prisma/client';
import { can, requireStaff, recordAudit } from '@/lib/console/auth';
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
import { liveDocument } from '@/lib/console/live';
import { authorText, prepareDocument } from '@/lib/console/document-ready';
import { isUniqueConflict, retryOnConflict } from '@/lib/console/conflict';
import { sourceFromSuggestion } from '@/lib/console/suggestions';
import { allow } from '@/lib/console/rate-limit';
import { issueSharedLink } from '@/lib/console/shared-links';
import { whatsappLink } from '@/lib/console/whatsapp';

export type DocumentState = { status: 'idle' | 'done' | 'error'; message?: string };

/** Thrown inside the send transaction when the document changed after it was checked. */
class MovedOn extends Error {}

/** Creates the document and its first, empty version. */
export async function createDocument(
  _previous: DocumentState,
  formData: FormData,
): Promise<DocumentState> {
  const staff = await requireStaff();
  if (!can(staff, 'documents')) return { status: 'error', message: NO_PERMISSION };

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

  const document = await retryOnConflict(() => db.$transaction(async (tx) => {
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
  }));

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
  if (!can(staff, 'documents')) return { status: 'error', message: NO_PERMISSION };

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
    where: { id: documentId, ...liveDocument },
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
  if (!can(staff, 'documents')) return { status: 'error', message: NO_PERMISSION };

  const documentId = String(formData.get('documentId') ?? '');
  const bodyMarkdown = formTextExact(formData, 'body');
  const changeNote = String(formData.get('changeNote') ?? '').trim();

  if (bodyMarkdown.length > 200_000) {
    return { status: 'error', message: 'That document is too long.' };
  }

  const document = await db.document.findUnique({
    where: { id: documentId, ...liveDocument },
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
  try {
    await db.documentVersion.create({
      data: {
        documentId: document.id,
        version,
        bodyMarkdown,
        changeNote: changeNote || null,
        createdById: staff.id,
      },
    });
  } catch (error) {
    // Version numbers are unique per document: someone else saved first.
    if (isUniqueConflict(error)) {
      return {
        status: 'error',
        message: 'Someone saved a version a moment ago. Copy your changes, reload, and apply them again.',
      };
    }
    throw error;
  }

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
  if (!can(staff, 'documents')) return { status: 'error', message: NO_PERMISSION };

  const documentId = String(formData.get('documentId') ?? '');
  const message = formText(formData, 'message');

  if (message.length < 2 || message.length > 4000) {
    return { status: 'error', message: 'Say what you would like.' };
  }

  const document = await db.document.findUnique({
    where: { id: documentId, ...liveDocument },
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

  if (!result.ok) {
    // Staff can see why: the API's own reason is on the activity record.
    return { status: 'error', message: `${result.error} The reason is in Activity.` };
  }
  return { status: 'done', message: result.reply };
}

/** A document checked and ready to go to be signed, with its fees filled in. */
type ReadyDocument = {
  document: {
    id: string;
    reference: string;
    title: string;
    kind: DocumentKind;
    project: {
      id: string;
      name: string;
      slug: string;
      currency: string;
      client: { id: string; name: string; slug: string; country: string };
    };
  };
  latest: { id: string; version: number; bodyMarkdown: string; sourceMarkdown: string | null };
  final: string;
  source: string;
  signer: { id: string; name: string; email: string | null };
};

/**
 * Everything checked before a document can go to be signed. A link shared
 * by hand needs no email, so for one the signer's missing email is not a
 * reason to stop; everything else still is.
 */
async function readyToSend(
  documentId: string,
  forLink: boolean,
): Promise<{ ok: false; message: string } | ({ ok: true } & ReadyDocument)> {
  const document = await db.document.findUnique({
    where: { id: documentId, ...liveDocument },
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
          client: { select: { id: true, name: true, slug: true, country: true } },
        },
      },
    },
  });

  if (!document) return { ok: false, message: 'That document no longer exists.' };
  if (document.status === 'signed') return { ok: false, message: 'This has already been signed.' };

  const latest = document.versions[0];
  if (!latest) {
    return { ok: false, message: 'There is nothing to send. Write the document first.' };
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
  const failing = prepared.checks.find(
    (check) => !check.ok && !(forLink && check.key === 'signer-email'),
  );
  if (failing || !prepared.signer) {
    return { ok: false, message: failing?.problem ?? 'The client has no main contact yet.' };
  }

  return {
    ok: true,
    document,
    latest,
    final: prepared.final,
    source: prepared.source,
    signer: prepared.signer,
  };
}

/**
 * Opens a signature request for the document as it would go now.
 *
 * The fee table is filled in from the project's fees, and the result is
 * saved as its own version, so the text the client signs, and the
 * fingerprint of it, include the exact amounts. Three things are then pinned
 * and never move again: that version, a SHA-256 of how it renders, and the
 * terms in force. The hash is recomputed when somebody signs and compared
 * with this one; that comparison is the whole proof. Any earlier request is
 * withdrawn, so nobody can sign a version we have moved on from.
 *
 * Returns null when the document changed after it was checked.
 */
async function openSignatureRequest(
  ready: ReadyDocument,
  staffId: string,
): Promise<{ id: string; version: number; documentHash: string; termsTitle: string | null } | null> {
  const { document, latest } = ready;
  const terms = await currentTerms();
  const documentHash = hashDocument(ready.final);

  let request: { id: string; version: number };
  // Set inside the transaction below; the cast stops TypeScript assuming it
  // stays null, since it cannot see assignments made in a callback.
  let moved = null as { from: ProjectStatus; to: ProjectStatus } | null;
  try {
    request = await db.$transaction(async (tx) => {
      // One send at a time per document, and against the version that was
      // checked: a second click, or an edit saved in the same moment, waits
      // here and then finds things have moved on.
      await tx.$queryRaw`SELECT id FROM "Document" WHERE id = ${document.id} FOR UPDATE`;
      const current = await tx.documentVersion.findFirst({
        where: { documentId: document.id },
        orderBy: { version: 'desc' },
        select: { id: true },
      });
      if (current?.id !== latest.id) throw new MovedOn();

      // The copy with the fees filled in is a version of its own, unless the
      // latest already is exactly that.
      const version =
        latest.bodyMarkdown === ready.final
          ? latest
          : await tx.documentVersion.create({
              data: {
                documentId: document.id,
                version: latest.version + 1,
                bodyMarkdown: ready.final,
                sourceMarkdown: ready.source,
                changeNote: 'Fees filled in for sending',
                createdById: staffId,
              },
              select: { id: true, version: true },
            });

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

      // A proposal or agreement going out moves the project on to match.
      moved = await advanceForDocument(tx, {
        projectId: document.project.id,
        kind: document.kind,
        milestone: 'sent',
        reference: document.reference,
        actorType: 'staff',
        actorId: staffId,
      });

      return { id: created.id, version: version.version };
    });
  } catch (error) {
    if (error instanceof MovedOn) return null;
    throw error;
  }

  if (moved) {
    await recordAudit({
      actorType: 'staff',
      actorId: staffId,
      action: 'project.status_changed',
      entityType: 'Project',
      entityId: document.project.id,
      summary: `${moved.from} → ${moved.to}, when ${document.reference} was sent`,
    });
  }
  return { ...request, documentHash, termsTitle: terms?.title ?? null };
}

/** Sends the document for signature by email. See openSignatureRequest. */
export async function sendForSignature(
  _previous: DocumentState,
  formData: FormData,
): Promise<DocumentState> {
  const staff = await requireStaff();
  if (!can(staff, 'documents')) return { status: 'error', message: NO_PERMISSION };

  const ready = await readyToSend(String(formData.get('documentId') ?? ''), false);
  if (!ready.ok) return { status: 'error', message: ready.message };
  const { document } = ready;
  if (!ready.signer.email) {
    return {
      status: 'error',
      message: `${ready.signer.name} has no email address yet. Share a link for them to sign instead.`,
    };
  }
  const contact = { ...ready.signer, email: ready.signer.email };

  const request = await openSignatureRequest(ready, staff.id);
  if (!request) {
    return {
      status: 'error',
      message: 'This changed a moment ago, or was just sent. Reload and check it before sending.',
    };
  }

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
      termsTitle: request.termsTitle,
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
    metadata: { documentHash: request.documentHash, version: request.version },
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

export type ShareState = {
  status: 'idle' | 'done' | 'error';
  message?: string;
  url?: string;
  whatsapp?: string;
  /** Who the link is for. */
  name?: string;
};

/**
 * A link for the signer to open and sign without email or the portal, for
 * sending by hand. When the version with them is still the one that would go
 * now, the link is for that same request; otherwise this opens a new one,
 * exactly as sending does, without the email. Any earlier shared link for
 * the request stops working.
 */
export async function shareSigningLink(
  _previous: ShareState,
  formData: FormData,
): Promise<ShareState> {
  const staff = await requireStaff();
  if (!can(staff, 'documents')) return { status: 'error', message: NO_PERMISSION };

  const ready = await readyToSend(formText(formData, 'documentId'), true);
  if (!ready.ok) return { status: 'error', message: ready.message };
  const { document, signer } = ready;

  const signerRow = await db.clientContact.findFirst({
    where: { id: signer.id, deletedAt: null, canSignIn: true },
    select: { phone: true },
  });
  if (!signerRow) {
    return { status: 'error', message: `${signer.name} has no portal access, so a link would not open.` };
  }

  const open = await db.signatureRequest.findFirst({
    where: { documentId: document.id, status: { in: ['sent', 'viewed'] } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, expiresAt: true, version: { select: { bodyMarkdown: true } } },
  });
  const reusable =
    open &&
    (!open.expiresAt || open.expiresAt.getTime() > Date.now()) &&
    open.version.bodyMarkdown === ready.final;
  const requestId = reusable
    ? open.id
    : (await openSignatureRequest(ready, staff.id))?.id;
  if (!requestId) {
    return {
      status: 'error',
      message: 'This changed a moment ago, or was just sent. Reload and check it first.',
    };
  }

  const url = await issueSharedLink({
    contactId: signer.id,
    thing: 'SignatureRequest',
    thingId: requestId,
  });
  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'document.link_shared',
    entityType: 'Document',
    entityId: document.id,
    summary: `${document.reference}: a link for ${signer.name} to sign, to share by hand`,
  });

  revalidatePath(`/admin/documents/${document.reference}`);
  revalidatePath(`/admin/projects/${document.project.slug}`);

  const first = signer.name.split(' ')[0] ?? signer.name;
  const message =
    `Hello ${first}, this is Ubunifu Technologies. Here is ${document.title} for you to read ` +
    `and sign: ${url}\n\nIt opens on your phone, and there is nothing to set up. The link is ` +
    `just for you and lasts 14 days, so please do not forward it.`;
  return {
    status: 'done',
    url,
    name: signer.name,
    whatsapp: whatsappLink(signerRow.phone, document.project.client.country, message),
  };
}

/**
 * Emails the signing link again for the version already with them, when the
 * first email was lost or never arrived. The same request, version and
 * fingerprint; only the link is new, as the old one may have run out. Once
 * the time to sign has passed this refuses, and sending again is the way.
 */
export async function resendSignatureLink(
  _previous: DocumentState,
  formData: FormData,
): Promise<DocumentState> {
  const staff = await requireStaff();
  if (!can(staff, 'documents')) return { status: 'error', message: NO_PERMISSION };

  const document = await db.document.findUnique({
    where: { id: formText(formData, 'documentId'), ...liveDocument },
    select: {
      id: true,
      reference: true,
      title: true,
      kind: true,
      project: {
        select: {
          slug: true,
          client: {
            select: {
              name: true,
              contacts: {
                where: { deletedAt: null, isPrimary: true, canSignIn: true },
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
      },
    },
  });
  if (!document) return { status: 'error', message: 'That document no longer exists.' };

  const request = await db.signatureRequest.findFirst({
    where: { documentId: document.id, status: { in: ['sent', 'viewed'] } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, expiresAt: true, termsVersion: { select: { title: true } } },
  });
  if (!request) return { status: 'error', message: 'Nothing is waiting for a signature.' };
  if (request.expiresAt && request.expiresAt.getTime() < Date.now()) {
    return { status: 'error', message: 'The time to sign has run out. Send it again instead.' };
  }

  const signer = document.project.client.contacts[0];
  if (!signer?.email) {
    return {
      status: 'error',
      message: 'Their main contact has no email or no portal access, so there is nobody to send it to.',
    };
  }
  if (!(await allow('signature-resend', document.id, { limit: 5, windowMinutes: 60 }))) {
    return { status: 'error', message: 'It has gone out several times in the last hour. Try later.' };
  }

  const { token } = await issueMagicToken({
    purpose: 'document_access',
    actorType: 'client_contact',
    actorId: signer.id,
    entityType: 'SignatureRequest',
    entityId: request.id,
  });
  const sent = await sendConsoleEmail({
    to: signer.email,
    subject: `${document.title}: ready for your signature`,
    html: documentToSignEmail({
      name: signer.name,
      clientName: document.project.client.name,
      documentTitle: document.title,
      kind: DOCUMENT_KIND_LABEL[document.kind],
      reference: document.reference,
      termsTitle: request.termsVersion?.title ?? null,
      url: `${consoleEnv.publicOrigin}/portal/sign-in/verify?token=${encodeURIComponent(token)}`,
    }),
    template: 'document_to_sign',
    entityType: 'Document',
    entityId: document.id,
  });

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: sent.ok ? 'document.resent' : 'document.resend_failed',
    entityType: 'Document',
    entityId: document.id,
    summary: sent.ok
      ? `${document.reference} to ${signer.email}`
      : `${document.reference}: could not send to ${signer.email}: ${sent.error}`,
  });
  revalidatePath(`/admin/documents/${document.reference}`);

  return sent.ok
    ? { status: 'done', message: `Sent to ${signer.name} (${signer.email}).` }
    : { status: 'error', message: `The email did not go: ${sent.error}` };
}

/**
 * Takes back a document that is waiting for a signature, so it can be changed
 * or a project can move on without it. Conditional on the request still being
 * open: if the client signs in the same moment, the signature wins and this
 * says so, rather than cancelling something that has just been agreed.
 */
export async function withdrawDocument(
  _previous: DocumentState,
  formData: FormData,
): Promise<DocumentState> {
  const staff = await requireStaff();
  if (!can(staff, 'documents')) return { status: 'error', message: NO_PERMISSION };

  const document = await db.document.findUnique({
    where: { id: formText(formData, 'documentId'), ...liveDocument },
    select: { id: true, reference: true, project: { select: { slug: true } } },
  });
  if (!document) return { status: 'error', message: 'That document no longer exists.' };

  const withdrawn = await db.$transaction(async (tx) => {
    const requests = await tx.signatureRequest.updateMany({
      where: { documentId: document.id, status: { in: ['sent', 'viewed'] } },
      data: { status: 'cancelled' },
    });
    if (requests.count === 0) return false;
    await tx.document.updateMany({
      where: { id: document.id, status: { in: ['sent', 'viewed'] } },
      data: { status: 'draft' },
    });
    return true;
  });

  if (!withdrawn) {
    const now = await db.document.findUnique({ where: { id: document.id }, select: { status: true } });
    return {
      status: 'error',
      message:
        now?.status === 'signed'
          ? 'It was signed a moment ago, so it cannot be withdrawn.'
          : 'There is nothing waiting for a signature.',
    };
  }

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'document.withdrawn',
    entityType: 'Document',
    entityId: document.id,
    summary: document.reference,
  });

  revalidatePath(`/admin/documents/${document.reference}`);
  revalidatePath(`/admin/projects/${document.project.slug}`);
  revalidatePath('/portal', 'layout');
  return { status: 'done', message: 'Withdrawn. You can change it and send it again.' };
}

/** Who sent a suggestion, named the way a change note or an audit line reads. */
function suggestedBy(suggestion: {
  contact: { name: string } | null;
  document: { project: { client: { name: string } } };
}): string {
  const client = suggestion.document.project.client.name;
  return suggestion.contact ? `${suggestion.contact.name} (${client})` : client;
}

/**
 * Starts the next version from a client's suggested wording.
 *
 * A new version like any other, never an edit of one: the version they were
 * sent, and anything signed, stays exactly as it was. Their text comes in with
 * the fee schedule turned back into the {{fees}} placeholder, so the next send
 * fills in the project's fees once instead of carrying a copy of the old table
 * with a fresh one underneath.
 */
export async function startFromSuggestion(
  _previous: DocumentState,
  formData: FormData,
): Promise<DocumentState> {
  const staff = await requireStaff();
  if (!can(staff, 'documents')) return { status: 'error', message: NO_PERMISSION };

  const suggestion = await db.documentSuggestion.findUnique({
    where: { id: formText(formData, 'suggestionId') },
    select: {
      id: true,
      status: true,
      basedOnVersion: true,
      bodyMarkdown: true,
      contact: { select: { name: true } },
      document: {
        select: {
          id: true,
          reference: true,
          status: true,
          project: { select: { slug: true, deletedAt: true, client: { select: { name: true } } } },
        },
      },
    },
  });
  if (!suggestion || suggestion.document.project.deletedAt) {
    return { status: 'error', message: 'That suggestion no longer exists.' };
  }
  const document = suggestion.document;
  if (document.status === 'signed') {
    return { status: 'error', message: 'This has been signed. A signed document cannot be edited.' };
  }
  if (suggestion.status !== 'open') {
    return { status: 'error', message: 'Someone has already dealt with this. Reload to see where it stands.' };
  }

  const seen = await db.documentVersion.findUnique({
    where: { documentId_version: { documentId: document.id, version: suggestion.basedOnVersion } },
    select: { bodyMarkdown: true, sourceMarkdown: true },
  });
  if (!seen) return { status: 'error', message: 'The version they saw no longer exists.' };

  const { source } = sourceFromSuggestion(seen, suggestion.bodyMarkdown);
  const who = suggestedBy(suggestion);

  let version: number;
  try {
    version = await db.$transaction(async (tx) => {
      // The same lock sending takes, and signing waits on the same row, so a
      // signature landing this moment is seen here rather than followed by a
      // new version nobody needs.
      await tx.$queryRaw`SELECT id FROM "Document" WHERE id = ${document.id} FOR UPDATE`;
      const current = await tx.document.findUnique({
        where: { id: document.id },
        select: { status: true },
      });
      if (current?.status === 'signed') throw new MovedOn('signed');

      const claimed = await tx.documentSuggestion.updateMany({
        where: { id: suggestion.id, status: 'open' },
        data: { status: 'used', resolvedAt: new Date() },
      });
      if (claimed.count !== 1) throw new MovedOn('resolved');

      const latest = await tx.documentVersion.findFirst({
        where: { documentId: document.id },
        orderBy: { version: 'desc' },
        select: { version: true },
      });
      const next = (latest?.version ?? 0) + 1;
      await tx.documentVersion.create({
        data: {
          documentId: document.id,
          version: next,
          bodyMarkdown: source,
          changeNote: `Wording suggested by ${who}`,
          createdById: staff.id,
        },
      });
      return next;
    });
  } catch (error) {
    if (error instanceof MovedOn) {
      return {
        status: 'error',
        message:
          error.message === 'signed'
            ? 'It was signed a moment ago, so it cannot change.'
            : 'Someone has already dealt with this. Reload to see where it stands.',
      };
    }
    // Version numbers are unique per document: a save landed in between.
    if (isUniqueConflict(error)) {
      return { status: 'error', message: 'Someone saved a version a moment ago. Reload and try again.' };
    }
    throw error;
  }

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'document.suggestion_used',
    entityType: 'Document',
    entityId: document.id,
    summary: `${document.reference}: version ${version} started from the wording ${who} suggested for version ${suggestion.basedOnVersion}`,
    metadata: { suggestionId: suggestion.id, version, basedOnVersion: suggestion.basedOnVersion },
  });

  revalidatePath(`/admin/documents/${document.reference}`);
  revalidatePath(`/admin/projects/${document.project.slug}`);
  revalidatePath(`/portal/documents/${document.reference}`);
  redirect(`/documents/${document.reference}?step=write`);
}

/** Takes a suggestion off the document without using it. The record keeps it. */
export async function setSuggestionAside(
  _previous: DocumentState,
  formData: FormData,
): Promise<DocumentState> {
  const staff = await requireStaff();
  if (!can(staff, 'documents')) return { status: 'error', message: NO_PERMISSION };

  const suggestion = await db.documentSuggestion.findUnique({
    where: { id: formText(formData, 'suggestionId') },
    select: {
      id: true,
      basedOnVersion: true,
      contact: { select: { name: true } },
      document: {
        select: {
          id: true,
          reference: true,
          project: { select: { slug: true, client: { select: { name: true } } } },
        },
      },
    },
  });
  if (!suggestion) return { status: 'error', message: 'That suggestion no longer exists.' };

  // Conditional, so it cannot undo a suggestion someone has just used.
  const updated = await db.documentSuggestion.updateMany({
    where: { id: suggestion.id, status: 'open' },
    data: { status: 'dismissed', resolvedAt: new Date() },
  });
  if (updated.count !== 1) {
    return { status: 'error', message: 'Someone has already dealt with this. Reload to see where it stands.' };
  }

  const document = suggestion.document;
  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'document.suggestion_set_aside',
    entityType: 'Document',
    entityId: document.id,
    summary: `${document.reference}: set aside the wording ${suggestedBy(suggestion)} suggested for version ${suggestion.basedOnVersion}`,
    metadata: { suggestionId: suggestion.id, basedOnVersion: suggestion.basedOnVersion },
  });

  revalidatePath(`/admin/documents/${document.reference}`);
  revalidatePath(`/admin/projects/${document.project.slug}`);
  revalidatePath(`/portal/documents/${document.reference}`);
  return { status: 'done', message: 'Set aside.' };
}
