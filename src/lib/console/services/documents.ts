import 'server-only';
import { db } from '@/lib/db';
import { DocumentKind } from '@/generated/prisma/client';
import { recordAudit } from '@/lib/console/auth';
import { retryOnConflict } from '@/lib/console/conflict';
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
