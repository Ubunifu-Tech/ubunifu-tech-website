import 'server-only';
import { db } from '@/lib/db';
import type { NavCounts } from '@/app/admin/ConsoleNav';
import { liveDocument, liveEnquiry, liveInvoice, liveTicket, renewingLine } from './live';
import { INVOICE_AHEAD_DAYS } from './renewals';
import { LIVE_STATUSES } from './project-status';

/**
 * The numbers in the sidebar.
 *
 * Only things that mean somebody is waiting, because a badge that is always
 * lit is furniture. Projects are the exception and are marked quiet in the nav
 * — a count of live work is orientation, not a summons.
 *
 * One round trip. This runs on every console page, so it is a single
 * Promise.all of counts rather than a query per section.
 */
export async function navCounts(): Promise<NavCounts> {
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + INVOICE_AHEAD_DAYS);

  const [enquiries, projects, invoices, renewals, documents, requests] = await Promise.all([
    db.enquiry.count({ where: { ...liveEnquiry, status: 'new' } }),
    db.project.count({ where: { deletedAt: null, status: { in: LIVE_STATUSES } } }),
    // Money we have asked for and not been paid. Draft and void are neither.
    db.invoice.count({ where: { ...liveInvoice, status: { in: ['sent', 'part_paid', 'overdue'] } } }),
    /**
     * Periods that are close enough to act on and have not been invoiced.
     * Counted from RenewalEvent rather than from the line's next date, so a
     * period already billed stops being a task — which is the whole point of
     * there being one row per period.
     */
    db.renewalEvent.count({
      where: {
        status: 'pending',
        dueAt: { lte: horizon },
        lineItem: renewingLine,
      },
    }),
    /*
     * Documents handed back with changes to make: the next move is ours, and
     * the Documents page opens on them. One out for signature is waiting on
     * the client, and 'declined' stays declined for ever; a badge that never
     * clears is a badge nobody reads. Both have their own views instead.
     */
    db.document.count({ where: { ...liveDocument, status: 'changes_requested' } }),
    // Waiting on us, not on them — a request handed back is not a task.
    db.ticket.count({ where: { ...liveTicket, status: { in: ['open', 'triaged', 'in_progress'] } } }),
  ]);

  return { enquiries, projects, invoices, renewals, documents, requests };
}
