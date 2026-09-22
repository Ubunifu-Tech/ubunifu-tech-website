import 'server-only';
import { db } from '@/lib/db';
import type { NavCounts } from '@/app/admin/ConsoleNav';

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

  const [enquiries, projects, invoices, renewals] = await Promise.all([
    db.enquiry.count({ where: { status: 'new' } }),
    db.project.count({
      where: {
        deletedAt: null,
        status: { in: ['contract_signed', 'in_progress', 'client_review', 'launch_ready'] },
      },
    }),
    // Money we have asked for and not been paid. Draft and void are neither.
    db.invoice.count({ where: { status: { in: ['sent', 'part_paid', 'overdue'] } } }),
    // A renewal is worth flagging once it is close enough to act on. Anything
    // further out is a diary entry, not a task.
    db.lineItem.count({
      where: {
        status: { in: ['planned', 'active'] },
        nextDueAt: { not: null, lte: horizon },
        project: { deletedAt: null, status: { notIn: ['closed', 'cancelled'] } },
      },
    }),
  ]);

  return { enquiries, projects, invoices, renewals };
}
