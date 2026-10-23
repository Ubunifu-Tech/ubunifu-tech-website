import 'server-only';
import { db } from '@/lib/db';
import type { NavCounts } from '@/app/admin/ConsoleNav';
import {
  liveDocument,
  liveEnquiry,
  liveInvoice,
  liveTicket,
  renewingLine,
  signingRanOut,
} from './live';
import { INVOICE_AHEAD_DAYS } from './renewals';
import { parseDateInput, todayInput } from './money';

/**
 * The numbers in the sidebar.
 *
 * Only things that mean somebody is waiting, because a badge that is always
 * lit is furniture: new enquiries, money past due or due to be invoiced,
 * documents back with us, and requests waiting on us.
 *
 * One round trip. This runs on every console page, so it is a single
 * Promise.all of counts rather than a query per section.
 */
export async function navCounts(): Promise<NavCounts> {
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + INVOICE_AHEAD_DAYS);

  // Midnight in Tanzania today: a typed date is noon UTC, 15:00 there.
  const startOfToday = new Date(parseDateInput(todayInput())!.getTime() - 15 * 60 * 60_000);

  const [enquiries, overdue, renewals, documents, requests] = await Promise.all([
    db.enquiry.count({ where: { ...liveEnquiry, status: 'new' } }),
    // Money asked for and past its due date. Not yet due is not yet a task.
    db.invoice.count({
      where: { ...liveInvoice, status: { in: ['sent', 'part_paid', 'overdue'] }, dueAt: { lt: startOfToday } },
    }),
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
     * Documents where the next move is ours: handed back with changes to
     * make, or out for signature after the time to sign ran out. The
     * Documents page opens on them. One still inside its time is waiting on
     * the client, and 'declined' stays declined for ever; a badge that never
     * clears is a badge nobody reads. Both have their own views instead.
     */
    db.document.count({
      where: {
        ...liveDocument,
        OR: [{ status: 'changes_requested' }, signingRanOut(new Date())],
      },
    }),
    // Waiting on us, not on them — a request handed back is not a task.
    db.ticket.count({ where: { ...liveTicket, status: { in: ['open', 'triaged', 'in_progress'] } } }),
  ]);

  return { enquiries, money: overdue + renewals, documents, requests };
}
