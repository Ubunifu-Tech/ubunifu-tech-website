import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { safePortalPath } from '@/lib/console/return-path';
import { consumeMagicToken } from '@/lib/console/magic-link';
import { createSession } from '@/lib/console/session';
import { recordAudit } from '@/lib/console/auth';
import { liveInvoice } from '@/lib/console/live';
import type { MagicTokenPurpose } from '@/generated/prisma/client';

/**
 * Every link we email a client comes through here. They differ in how long
 * they live — a sign-in link twenty minutes, an invitation or a contract two
 * weeks, an invoice thirty days — which is why they are different purposes,
 * and they differ in where they land. Before this list existed the route took
 * only sign_in, so an invoice link was dead on arrival and every invitation
 * and contract link had quietly been issued as a twenty-minute sign-in link
 * while its email promised two weeks.
 */
const CLIENT_LINKS: readonly MagicTokenPurpose[] = [
  'sign_in',
  'invite',
  'document_access',
  'invoice_access',
];

/**
 * Where a link lands after it signs someone in.
 *
 * An email that says "view your invoice" should open the invoice, not a
 * dashboard the client then has to search. The destination comes ONLY from
 * the token row — never from a query parameter, which would make this an open
 * redirect — and it is re-scoped to the contact's own client, so a token
 * pointing at somebody else's record lands on the portal home instead.
 */
async function landingFor(
  claim: { entityType: string | null; entityId: string | null },
  clientId: string,
): Promise<string> {
  if (!claim.entityId) return '/portal';

  if (claim.entityType === 'Path') return safePortalPath(claim.entityId) ?? '/portal';

  if (claim.entityType === 'Invoice') {
    const invoice = await db.invoice.findFirst({
      where: { id: claim.entityId, clientId, ...liveInvoice },
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
 * Burns a client sign-in link and starts a portal session.
 *
 * The same route serves an invitation and an ordinary sign-in. Which one it was
 * is decided by the account, not by the link: an unactivated contact is sent to
 * finish setting up, everyone else goes to the portal. That means an invitation
 * cannot be re-used as a way to skip activation, and a normal link cannot drop
 * someone back into the setup form.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  const origin = new URL(request.url).origin;
  const signIn = new URL('/portal/sign-in', origin);

  if (!token) {
    signIn.searchParams.set('error', 'missing');
    return NextResponse.redirect(signIn);
  }

  const claim = await consumeMagicToken(token, CLIENT_LINKS);
  if (!claim || claim.actorType !== 'client_contact') {
    signIn.searchParams.set('error', 'expired');
    return NextResponse.redirect(signIn);
  }

  const contact = await db.clientContact.findUnique({
    where: { id: claim.actorId },
    select: {
      id: true,
      clientId: true,
      canSignIn: true,
      deletedAt: true,
      activatedAt: true,
      client: { select: { deletedAt: true } },
    },
  });

  // Re-checked at the moment of use: access revoked after the link was sent
  // must not still let someone in.
  if (!contact || !contact.canSignIn || contact.deletedAt || contact.client.deletedAt) {
    await recordAudit({
      actorType: 'system',
      action: 'client.sign_in.rejected_at_use',
      entityType: 'ClientContact',
      entityId: claim.actorId,
      summary: 'Contact removed or portal access revoked',
    });
    signIn.searchParams.set('error', 'expired');
    return NextResponse.redirect(signIn);
  }

  await createSession({
    actorType: 'client_contact',
    actorId: contact.id,
    audience: 'portal',
  });
  await db.clientContact.update({
    where: { id: contact.id },
    data: { lastSeenAt: new Date(), failedSignIns: 0, lockedUntil: null },
  });
  await recordAudit({
    actorType: 'client_contact',
    actorId: contact.id,
    action: contact.activatedAt ? 'client.sign_in.success' : 'client.invite.opened',
    entityType: 'ClientContact',
    entityId: contact.id,
  });

  // Someone who has not set a password finishes that first, whatever the link
  // was for; the thing it pointed at is one click away from the portal home.
  const destination = contact.activatedAt
    ? await landingFor(claim, contact.clientId)
    : '/portal/activate';

  return NextResponse.redirect(new URL(destination, origin));
}
