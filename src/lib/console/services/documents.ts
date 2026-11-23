import 'server-only';
import { db } from '@/lib/db';
import { DocumentKind } from '@/generated/prisma/client';
import { recordAudit } from '@/lib/console/auth';
import { isUniqueConflict, retryOnConflict } from '@/lib/console/conflict';
import { authorText } from '@/lib/console/document-ready';
import { liveDocument } from '@/lib/console/live';
import { nextDocumentReference } from '@/lib/console/documents';

/**
 * Starting a document: a proposal, an agreement and so on, as a draft with its
 * first version. Shared by the Documents screen and the console assistant.
 * Nothing here sends anything; a draft goes to a client only from its own
 * Send step, after the checks there.
 */

export type DocumentCheck =
  | { ok: true; value: { kind: DocumentKind; title: string; bodyMarkdown: string } }
  | { ok: false; message: string };

export function checkNewDocument(draft: {
  kind: string;
  title: string;
  bodyMarkdown?: string;
}): DocumentCheck {
  if (!Object.values(DocumentKind).includes(draft.kind as DocumentKind)) {
    return { ok: false, message: 'Choose what kind of document this is.' };
  }
  const title = draft.title.trim();
  if (title.length < 3 || title.length > 200) {
    return { ok: false, message: 'Give the document a title.' };
  }
  const bodyMarkdown = (draft.bodyMarkdown ?? '').trim();
  if (bodyMarkdown.length > 200_000) {
    return { ok: false, message: 'That is too long to save. Make it shorter.' };
  }
  return { ok: true, value: { kind: draft.kind as DocumentKind, title, bodyMarkdown } };
}

export async function createDraftDocument(input: {
  projectId: string;
  kind: DocumentKind;
  title: string;
  /** Empty for a document somebody is about to write by hand. */
  bodyMarkdown?: string;
  staffId: string;
  /** Set when the assistant wrote the first version, and with which model. */
  aiModel?: string;
}): Promise<{ id: string; reference: string }> {
  const body = input.bodyMarkdown ?? '';
  const document = await retryOnConflict(() =>
    db.$transaction(async (tx) => {
      const reference = await nextDocumentReference(tx, input.kind);
      return tx.document.create({
        data: {
          projectId: input.projectId,
          kind: input.kind,
          title: input.title,
          reference,
          versions: {
            create: {
              version: 1,
              bodyMarkdown: body,
              changeNote: input.aiModel && body ? 'Drafted by the assistant' : 'Created',
              createdById: input.staffId,
              ...(input.aiModel && body ? { aiAssisted: true, aiModel: input.aiModel } : {}),
            },
          },
        },
        select: { id: true, reference: true },
      });
    }),
  );

  await recordAudit({
    actorType: 'staff',
    actorId: input.staffId,
    action: 'document.created',
    entityType: 'Document',
    entityId: document.id,
    summary: `${document.reference}: ${input.title}`,
    ...(input.aiModel ? { metadata: { viaAssistant: true } } : {}),
  });

  return document;
}

export type Revisable = {
  id: string;
  reference: string;
  title: string;
  kind: DocumentKind;
  projectName: string;
  /** The latest version's number, or 0 when nothing has been written. */
  version: number;
  /** The text as its author last saved it, placeholders and all. */
  text: string;
};

/**
 * A document that can be given a new version, with the text it stands at. A
 * signed one cannot: what was signed is fixed, and a change order is the way
 * to alter it.
 */
export async function revisable(reference: string): Promise<{ ok: true; document: Revisable } | { ok: false; message: string }> {
  const document = await db.document.findFirst({
    where: { reference, ...liveDocument },
    select: {
      id: true,
      reference: true,
      title: true,
      kind: true,
      status: true,
      project: { select: { name: true } },
      versions: {
        orderBy: { version: 'desc' },
        take: 1,
        select: { version: true, bodyMarkdown: true, sourceMarkdown: true },
      },
    },
  });
  if (!document) return { ok: false, message: `There is no document ${reference}.` };
  if (document.status === 'signed') {
    return {
      ok: false,
      message: `${document.reference} has been signed and cannot be changed. A change order is the way to alter a signed agreement.`,
    };
  }
  const latest = document.versions[0];
  return {
    ok: true,
    document: {
      id: document.id,
      reference: document.reference,
      title: document.title,
      kind: document.kind,
      projectName: document.project.name,
      version: latest?.version ?? 0,
      text: latest ? authorText(latest).trim() : '',
    },
  };
}

/** A whole document body, as it must be before it is saved as a version. */
export function checkBody(bodyMarkdown: string): { ok: true; body: string } | { ok: false; message: string } {
  const body = bodyMarkdown.trim();
  if (body.length < 40) return { ok: false, message: 'That is too short to be a document. Write the whole thing, not the part that changed.' };
  if (body.length > 200_000) return { ok: false, message: 'That is too long to save. Make it shorter.' };
  return { ok: true, body };
}

/**
 * Saves a new version on top of the one it was written from. Refused when
 * somebody saved another version in between, so nothing a person typed is
 * written over by a draft made from the text before it.
 */
export async function saveRevision(input: {
  documentId: string;
  reference: string;
  /** The version the new text was written from. */
  fromVersion: number;
  bodyMarkdown: string;
  changeNote: string;
  staffId: string;
  aiModel: string;
}): Promise<{ ok: true; version: number } | { ok: false; message: string }> {
  const latest = await db.documentVersion.findFirst({
    where: { documentId: input.documentId },
    orderBy: { version: 'desc' },
    select: { version: true },
  });
  if ((latest?.version ?? 0) !== input.fromVersion) {
    return { ok: false, message: `${input.reference} was edited after this was written. Ask again to work from the latest version.` };
  }
  const version = input.fromVersion + 1;
  try {
    await db.documentVersion.create({
      data: {
        documentId: input.documentId,
        version,
        bodyMarkdown: input.bodyMarkdown,
        changeNote: input.changeNote.trim().slice(0, 200) || 'Revised by Copilot',
        aiAssisted: true,
        aiModel: input.aiModel,
        createdById: input.staffId,
      },
    });
  } catch (error) {
    if (isUniqueConflict(error)) {
      return { ok: false, message: `Someone saved a version of ${input.reference} at the same moment. Ask again to work from it.` };
    }
    throw error;
  }
  await recordAudit({
    actorType: 'staff',
    actorId: input.staffId,
    action: 'document.version_saved',
    entityType: 'Document',
    entityId: input.documentId,
    summary: `${input.reference}, version ${version}: ${input.changeNote.trim().slice(0, 160) || 'revised'}`,
    metadata: { viaAssistant: true },
  });
  return { ok: true, version };
}
