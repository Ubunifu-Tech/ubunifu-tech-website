import type { Prisma } from '@/generated/prisma/client';

/**
 * What "still here" means for records that hang off a client or a project.
 *
 * Removing a client or a project sets deletedAt and keeps every row, so the
 * record and the money stay true. Lists and counts then have to leave out
 * whatever belongs to something removed, and the rules for that live here so
 * each screen does not rebuild the relations by hand and miss one.
 *
 * Removing a client removes its projects in the same transaction, so a live
 * project always has a live client and a project check alone is enough.
 *
 * An invoice, a request or a managed service may have no project. The OR on
 * projectId keeps those, and each helper wraps its conditions in AND so it can
 * be spread next to a screen's own OR (a search) without the two colliding.
 */

/** The project has not been removed. */
export const liveProject = { deletedAt: null } satisfies Prisma.ProjectWhereInput;

/** Belongs to a client that is still here, and to no removed project. */
export const liveInvoice = {
  AND: [
    { client: { deletedAt: null } },
    { OR: [{ projectId: null }, { project: { deletedAt: null } }] },
  ],
} satisfies Prisma.InvoiceWhereInput;

/** The same rule for a client request. */
export const liveTicket = {
  AND: [
    { client: { deletedAt: null } },
    { OR: [{ projectId: null }, { project: { deletedAt: null } }] },
  ],
} satisfies Prisma.TicketWhereInput;

/** The same rule for a domain, a hosting plan or a mailbox we look after. */
export const liveManagedService = {
  AND: [
    { client: { deletedAt: null } },
    { OR: [{ projectId: null }, { project: { deletedAt: null } }] },
  ],
} satisfies Prisma.ManagedServiceWhereInput;

/** A document always belongs to a project. */
export const liveDocument = { project: liveProject } satisfies Prisma.DocumentWhereInput;

/** A payment is shown where its invoice is. */
export const livePayment = { invoice: liveInvoice } satisfies Prisma.PaymentWhereInput;

/**
 * A payment that counts as money received: live, and not reversed. A reversed
 * payment is still listed where it was recorded, marked, but no total includes it.
 */
export const countedPayment = {
  reversedAt: null,
  invoice: liveInvoice,
} satisfies Prisma.PaymentWhereInput;

/**
 * A fee line that still renews. The line's own status decides it: closing a
 * project ends the build, not the hosting or the domain the client goes on
 * paying for, so a closed project's renewals keep coming. Only a cancelled or
 * removed project stops them; pausing or cancelling the line itself is how a
 * service that really ends is stopped.
 */
export const renewingLine = {
  status: { in: ['planned', 'active'] },
  project: { deletedAt: null, status: { not: 'cancelled' } },
} satisfies Prisma.LineItemWhereInput;

/** An enquiry that has not been removed from the console. */
export const liveEnquiry = { deletedAt: null } satisfies Prisma.EnquiryWhereInput;

/**
 * Something we asked the client for that they still have to send: the one
 * meaning of "waiting on you", for their portal, its assistant and our own
 * screens alike. An item marked not available is on hold, not waiting.
 */
export const waitingOnClient = { status: 'requested' } satisfies Prisma.AssetRequestWhereInput;

/**
 * A document waiting for the client's signature: sent, not answered, and
 * still inside its time to sign. One that ran out, or that they asked us to
 * change, is waiting on us instead, and is not counted as theirs to do.
 */
export const awaitingSignature = (now: Date) =>
  ({
    signatureRequests: {
      some: {
        status: { in: ['sent', 'viewed'] },
        respondedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    },
  }) satisfies Prisma.DocumentWhereInput;

/**
 * An invoice the client can see: anything we sent them. One we cancelled
 * stays, marked, because their emails, receipts and refund notes point at
 * it. One cancelled before it was ever sent was never theirs.
 */
export const sentToClient = {
  OR: [{ status: { notIn: ['draft', 'void'] } }, { status: 'void', issuedAt: { not: null } }],
} satisfies Prisma.InvoiceWhereInput;
