import 'server-only';
import { db } from '@/lib/db';
import type { MagicTokenPurpose } from '@/generated/prisma/client';
import { safePortalPath } from './return-path';
import { liveInvoice, sentToClient } from './live';

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
