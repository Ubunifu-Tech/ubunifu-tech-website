import { getClientActor } from '@/lib/console/auth';
import { db } from '@/lib/db';
import { streamUpload } from '@/lib/console/uploads';

/**
 * A client opening a file from their own work.
 *
 * Objects in the store are private, so the store serves this to nobody. It
 * comes through here, on our own domain, and here decides. That is the whole
 * reason not to use public blob URLs: a link that is its own permission is a
 * link that cannot be taken back, cannot be logged, and works for anyone it is
 * ever forwarded to.
 *
 * A file hangs off one of three things, and OWNING THE PROJECT IS NOT ENOUGH
 * for two of them:
 *
 *   assetRequest  — something they sent us. Theirs by definition.
 *   update        — a progress update. Only once PUBLISHED. A draft update is
 *                   us still writing, and its attachments are not news yet.
 *   ticketMessage — a reply on their request. NOT when the message is
 *                   internal: "Internal notes stay out of the portal" has to
 *                   mean the attachment too, or the note is private and the
 *                   file stapled to it is not.
 *
 * All three conditions live in the WHERE clause. A file that fails any of them
 * does not match, so a guessed id is a 404 exactly like an id that never
 * existed — the response never distinguishes "not yours" from "not a file".
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const actor = await getClientActor();
  if (!actor || !actor.isActivated) return new Response(null, { status: 404 });

  const { id } = await params;
  const mine = { project: { clientId: actor.clientId, deletedAt: null } };

  const file = await db.fileUpload.findFirst({
    where: {
      id,
      deletedAt: null,
      OR: [
        { assetRequest: { is: mine } },
        { update: { is: { ...mine, status: 'published' } } },
        {
          ticketMessage: {
            is: { isInternal: false, ticket: { is: { clientId: actor.clientId } } },
          },
        },
      ],
    },
    select: { storageKey: true, filename: true },
  });
  if (!file) return new Response(null, { status: 404 });

  return streamUpload(file.storageKey, file.filename);
}
