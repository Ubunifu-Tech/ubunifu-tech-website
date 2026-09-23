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
  AND: [{ client: { deletedAt: null } }, { OR: [{ projectId: null }, { project: { deletedAt: null } }] }],
} satisfies Prisma.InvoiceWhereInput;

/** The same rule for a client request. */
export const liveTicket = {
  AND: [{ client: { deletedAt: null } }, { OR: [{ projectId: null }, { project: { deletedAt: null } }] }],
} satisfies Prisma.TicketWhereInput;

/** The same rule for a domain, a hosting plan or a mailbox we look after. */
export const liveManagedService = {
  AND: [{ client: { deletedAt: null } }, { OR: [{ projectId: null }, { project: { deletedAt: null } }] }],
} satisfies Prisma.ManagedServiceWhereInput;

/** A document always belongs to a project. */
export const liveDocument = { project: liveProject } satisfies Prisma.DocumentWhereInput;

/** A payment is shown where its invoice is. */
export const livePayment = { invoice: liveInvoice } satisfies Prisma.PaymentWhereInput;

/** A renewal period belongs to a fee line on a project. */
export const liveRenewal = {
  lineItem: { project: liveProject },
} satisfies Prisma.RenewalEventWhereInput;

/** An enquiry that has not been removed from the console. */
export const liveEnquiry = { deletedAt: null } satisfies Prisma.EnquiryWhereInput;
