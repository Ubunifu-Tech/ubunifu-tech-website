import 'server-only';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { recordAudit } from './auth';
import { alertTeam } from './alerts';
import { consoleEnv } from './env';
import { allow } from './rate-limit';
import { documentFreshCopyEmail, documentResponseEmail } from '@/lib/emails';

export type DocumentAnswerOutcome = { status: 'done' | 'error'; message: string };

type Person = { id: string; name: string; email: string | null; clientId: string; clientName: string };

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
 * act on, and the note is the entire point of collecting the answer here.
 *
 * The same from the portal and from a link shared by hand; the record says
 * which way it came.
 */
export async function recordDocumentAnswer(input: {
  requestId: string;
  person: Person;
  intent: string;
  note: string;
  via: 'portal' | 'shared_link';
}): Promise<DocumentAnswerOutcome> {
  const { person: actor, intent } = input;
  const note = input.note.trim();

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
    return {
      status: 'error',
      message: 'That is longer than this box can take. Send it as a request instead.',
    };
  }

  const request = await db.signatureRequest.findFirst({
    where: {
      id: input.requestId,
      document: { project: { clientId: actor.clientId, deletedAt: null } },
    },
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
          project: { select: { slug: true, owner: { select: { email: true, isActive: true, role: true } } } },
        },
      },
    },
  });

  if (!request) return { status: 'error', message: 'That document is not available.' };
  if (request.status === 'signed') {
    return { status: 'error', message: 'This has already been signed.' };
  }
  // Each of these used to fall through to one message, "we already have your
  // answer", including for a request we had WITHDRAWN, where the client had
  // never answered anything. Say which it actually is.
  if (request.status === 'declined' || request.respondedAt) {
    return { status: 'error', message: 'We already have your answer on this one.' };
  }
  if (request.status === 'cancelled') {
    return {
      status: 'error',
      message:
        'We withdrew this version, so there is nothing to answer. We will send you the new one.',
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
      // claim because asking for changes does not move the status. Without
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

  const byLink = input.via === 'shared_link';
  await recordAudit({
    actorType: 'client_contact',
    actorId: actor.id,
    action: declined ? 'document.declined' : 'document.changes_requested',
    entityType: 'Document',
    entityId: request.document.id,
    summary: `${
      declined
        ? `${request.document.reference} declined by ${actor.name}`
        : `${request.document.reference}: ${actor.name} asked for changes`
    }${byLink ? ', through a link shared by hand' : ''}`,
    metadata: { version: request.version.version, note, via: input.via },
  });

  // Our own alert. The answer is already recorded, so this failing costs us
  // promptness and nothing else, which is why it is not in the transaction.
  await alertTeam({
    owner: request.document.project.owner,
    need: 'documents',
    subject: `[${request.document.reference}] ${declined ? 'Declined' : 'Changes requested'}`,
    html: documentResponseEmail({
      reference: request.document.reference,
      title: request.document.title,
      clientName: actor.clientName,
      from: actor.name,
      fromEmail: actor.email ?? 'no email, answered through a link shared by hand',
      declined,
      note,
      version: request.version.version,
      url: `${consoleEnv.adminOrigin}/documents/${request.document.reference}`,
    }),
    template: declined ? 'document_declined' : 'document_changes_requested',
    entityType: 'Document',
    entityId: request.document.id,
    replyTo: actor.email,
  });

  revalidatePath('/portal/documents');
  revalidatePath(`/portal/documents/${request.document.reference}`);
  revalidatePath('/portal/link', 'layout');
  revalidatePath(`/admin/documents/${request.document.reference}`);
  revalidatePath(`/admin/projects/${request.document.project.slug}`);

  return {
    status: 'done',
    message: declined
      ? 'Recorded. Nothing has been signed and nothing has been charged. We will be in touch.'
      : 'Sent. We will look at it and send you a new version.',
  };
}

/**
 * The time to sign ran out, and they would still like to. Tells the team,
 * who send it again: a fresh request carries the terms in force today, which
 * quietly reopening the old one would not.
 */
export async function askForFreshCopy(input: {
  requestId: string;
  person: Person;
  via: 'portal' | 'shared_link';
}): Promise<DocumentAnswerOutcome> {
  const { person } = input;
  const request = await db.signatureRequest.findFirst({
    where: {
      id: input.requestId,
      document: { project: { clientId: person.clientId, deletedAt: null } },
    },
    select: {
      id: true,
      status: true,
      expiresAt: true,
      document: {
        select: {
          id: true,
          reference: true,
          title: true,
          project: { select: { owner: { select: { email: true, isActive: true, role: true } } } },
        },
      },
    },
  });

  const expired =
    request?.expiresAt !== null &&
    request?.expiresAt !== undefined &&
    request.expiresAt.getTime() < Date.now();
  if (!request || !expired || !['sent', 'viewed'].includes(request.status)) {
    return { status: 'error', message: 'There is nothing here to send again.' };
  }

  const thanks = 'Thank you. We will send you a fresh copy to sign.';
  // Once a day is plenty: the team already knows after the first.
  if (!(await allow('fresh-copy', request.id, { limit: 1, windowMinutes: 60 * 24 }))) {
    return { status: 'done', message: thanks };
  }

  await recordAudit({
    actorType: 'client_contact',
    actorId: person.id,
    action: 'document.fresh_copy_asked',
    entityType: 'Document',
    entityId: request.document.id,
    summary: `${request.document.reference}: ${person.name} asked for a fresh copy to sign${
      input.via === 'shared_link' ? ', through a link shared by hand' : ''
    }`,
  });
  await alertTeam({
    owner: request.document.project.owner,
    need: 'documents',
    subject: `[${request.document.reference}] Asked to send it again`,
    html: documentFreshCopyEmail({
      reference: request.document.reference,
      title: request.document.title,
      clientName: person.clientName,
      from: person.name,
      url: `${consoleEnv.adminOrigin}/documents/${request.document.reference}`,
    }),
    template: 'document_fresh_copy_asked',
    entityType: 'Document',
    entityId: request.document.id,
    replyTo: person.email,
  });

  return { status: 'done', message: thanks };
}
