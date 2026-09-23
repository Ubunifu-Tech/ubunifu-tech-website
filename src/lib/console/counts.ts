import 'server-only';
import { db } from '@/lib/db';
import type { NavCounts } from '@/app/admin/ConsoleNav';
import { liveDocument, liveEnquiry, liveInvoice, liveTicket } from './live';

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
  horizon.setDate(horizon.getDate() + 45);

  const [enquiries, projects, invoices, renewals, documents, requests] = await Promise.all([
    db.enquiry.count({ where: { ...liveEnquiry, status: 'new' } }),
    db.project.count({
      where: {
        deletedAt: null,
        status: { in: ['contract_signed', 'in_progress', 'client_review', 'launch_ready'] },
      },
    }),
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
        lineItem: {
          status: { in: ['planned', 'active'] },
          project: { deletedAt: null, status: { notIn: ['closed', 'cancelled'] } },
        },
      },
    }),
    /*
     * Documents where somebody is still waiting: out for signature, or handed
     * back with changes to make. 'declined' is deliberately NOT here — a deal
     * that died stays declined for ever, and a badge that never clears is a
     * badge nobody reads. It has its own view on the documents list instead.
     */
    db.document.count({
      where: { ...liveDocument, status: { in: ['sent', 'viewed', 'changes_requested'] } },
    }),
    // Waiting on us, not on them — a request handed back is not a task.
    db.ticket.count({ where: { ...liveTicket, status: { in: ['open', 'triaged', 'in_progress'] } } }),
  ]);

  return { enquiries, projects, invoices, renewals, documents, requests };
}
