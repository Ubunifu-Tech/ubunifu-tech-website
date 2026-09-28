import 'server-only';
import { db } from '@/lib/db';

type ReplyContact = {
  name: string;
  email: string | null;
  canSignIn: boolean;
  deletedAt: Date | null;
};

/**
 * Who a staff reply on a request is emailed to.
 *
 * Whoever at the client wrote last, which is not always the person who raised
 * it, as long as they are still there and can sign in; otherwise the person who
 * raised it. Null when that person has been removed or cannot sign in, so the
 * reply only waits in the portal. The reply box and the action both ask here,
 * so what the box promises is what the action does.
 */
export async function replyRecipient(ticket: {
  id: string;
  clientId: string;
  openedBy: ReplyContact | null;
}): Promise<ReplyContact | null> {
  const lastWord = await db.ticketMessage.findFirst({
    where: { ticketId: ticket.id, actorType: 'client_contact' },
    orderBy: { createdAt: 'desc' },
    select: { actorId: true },
  });
  const lastWriter = lastWord?.actorId
    ? await db.clientContact.findFirst({
        where: { id: lastWord.actorId, clientId: ticket.clientId, deletedAt: null, canSignIn: true },
        select: { name: true, email: true, canSignIn: true, deletedAt: true },
      })
    : null;
  const contact = lastWriter?.email ? lastWriter : ticket.openedBy;
  if (!contact || contact.deletedAt || !contact.canSignIn) return null;
  return contact;
}
