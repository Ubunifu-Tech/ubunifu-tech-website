import 'server-only';
import { db } from '@/lib/db';
import type { MagicTokenPurpose } from '@/generated/prisma/client';
import { safePortalPath } from './return-path';
import { liveInvoice, sentToClient } from './live';
import { readLink } from './magic-link';
import { readSession } from './session';

/**
 * Every link that signs a client in comes through /portal/sign-in/verify.
 * (A link to choose a new password is the exception: it opens its own page,
 * /portal/reset, and signs nobody in until the new password is saved.) They
 * differ in how long they live — a sign-in link twenty minutes, an invitation
 * or a contract two weeks, an invoice thirty days — which is why they are
 * different purposes, and they differ in where they land. Before this list
 * existed the route took only sign_in, so an invoice link was dead on arrival
 * and every invitation and contract link had quietly been issued as a
 * twenty-minute sign-in link while its email promised two weeks.
 */
export const CLIENT_LINKS: readonly MagicTokenPurpose[] = [
  'sign_in',
  'invite',
  'document_access',
  'invoice_access',
];

/**
 * Every link that went to a contact's inbox: the ones above, and a link to
 * choose a new password. A new address, a new password or access turned off
 * ends all of them at once, so no link sent before the change still opens
 * the portal after it.
 */
export const EMAILED_LINKS: readonly MagicTokenPurpose[] = [...CLIENT_LINKS, 'password_reset'];

/**
 * Where a link lands after it signs someone in.
 *
 * An email that says "view your invoice" should open the invoice, not a
 * dashboard the client then has to search. The destination comes ONLY from
 * the token row — never from a query parameter, which would make this an open
 * redirect — and it is re-scoped to the contact's own client, so a token
 * pointing at somebody else's record lands on the portal home instead.
 */
export async function landingFor(
  claim: { entityType: string | null; entityId: string | null },
  clientId: string,
): Promise<string> {
  if (!claim.entityId) return '/portal';

  if (claim.entityType === 'Path') return safePortalPath(claim.entityId) ?? '/portal';

  if (claim.entityType === 'Invoice') {
    const invoice = await db.invoice.findFirst({
      where: { id: claim.entityId, clientId, ...liveInvoice, ...sentToClient },
      select: { number: true },
    });
    if (invoice) return `/portal/invoices/${encodeURIComponent(invoice.number)}`;
  }

  if (claim.entityType === 'SignatureRequest') {
    const request = await db.signatureRequest.findFirst({
      where: { id: claim.entityId, document: { project: { clientId, deletedAt: null } } },
      select: { document: { select: { reference: true } } },
    });
    if (request) return `/portal/documents/${encodeURIComponent(request.document.reference)}`;
  }

  return '/portal';
}

/**
 * Where a link that no longer works should take someone, instead of a dead
 * end. An old link still says who it was for and where it pointed: the same
 * person, still signed in on this device, goes straight there; anyone else
 * signs in first and lands there after. A setup link for someone who has not
 * finished has a message of its own, since they have nothing to sign in with.
 */
export async function afterDeadLink(rawToken: string): Promise<string> {
  const old = await readLink(rawToken, CLIENT_LINKS);
  if (!old || old.actorType !== 'client_contact') return '/portal/sign-in?error=expired';
  const contact = await db.clientContact.findUnique({
    where: { id: old.actorId },
    select: { clientId: true, activatedAt: true },
  });
  if (!contact) return '/portal/sign-in?error=expired';

  const session = await readSession('portal');
  const same = session?.actorType === 'client_contact' && session.actorId === old.actorId;
  if (!contact.activatedAt) return same ? '/portal/activate' : '/portal/sign-in?error=setup-expired';

  const landing = await landingFor(old, contact.clientId);
  if (same) return landing;
  if (old.purpose === 'invite') return '/portal/sign-in?error=set-up';
  return landing === '/portal'
    ? '/portal/sign-in?error=expired'
    : `/portal/sign-in?error=expired&next=${encodeURIComponent(landing)}`;
}
