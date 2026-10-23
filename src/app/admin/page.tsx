import Link from 'next/link';
import { db } from '@/lib/db';
import { can, requireStaff } from '@/lib/console/auth';
import { daysFromToday, formatMoney, formatRelative, formatShortDate, isPastDay, numbers, toDateInputValue } from '@/lib/console/money';
import { liveDocument, liveEnquiry, liveInvoice, liveTicket, renewingLine, signingRanOut } from '@/lib/console/live';
import { periodLabel, INVOICE_AHEAD_DAYS } from '@/lib/console/renewals';
import { Callout } from '@/components/console/Callout';
import { unresolvedEmailFailures } from '@/lib/console/email-failures';
import { greeting } from '@/lib/console/greeting';
import { InvoiceIt, StartWork, TaskDone } from './HomeActions';
import styles from './Admin.module.css';
import table from '@/styles/table.module.css';

// Absolute: a layout template does not apply to its own sibling page, so a
// plain string here would inherit the marketing site's title template.
export const metadata = { title: { absolute: 'Home · Ubunifu Console' } };

/** How many of each kind are listed; the lead line counts all of them. */
const EACH = 10;

type Row = {
  key: string;
  type: string;
  what: string;
  href: string;
  client: string | null;
  since: Date;
  amount: string | null;
  action: React.ReactNode;
};

/**
 * Home: one list of what needs this person, oldest first, each row with the
 * press that finishes it where one can. A row leaves the list once it is done.
 */
export default async function Home() {
  const staff = await requireStaff();
  const now = new Date();
  const soon = new Date(now);
  soon.setDate(soon.getDate() + INVOICE_AHEAD_DAYS);
  const weekOut = daysFromToday(7);

  const seesEnquiries = can(staff, 'enquiries');
  const seesRequests = can(staff, 'requests');
  const seesDocuments = can(staff, 'documents');
  const runsProjects = can(staff, 'projects');
  const seesMoney = can(staff, 'invoices');

  const enquiriesWhere = { ...liveEnquiry, status: 'new' as const };
  const requestsWhere = { ...liveTicket, status: { in: ['open' as const, 'triaged' as const, 'in_progress' as const] } };
  const documentsWhere = { ...liveDocument, OR: [{ status: 'changes_requested' as const }, signingRanOut(now)] };
  const renewalsWhere = { status: 'pending' as const, dueAt: { lte: soon }, lineItem: renewingLine };
  const draftsWhere = { ...liveInvoice, status: 'draft' as const };
  const tasksWhere = {
    assigneeId: staff.id,
    isComplete: false,
    dueAt: { lte: weekOut },
    phase: { project: { deletedAt: null, status: { notIn: ['closed' as const, 'cancelled' as const] } } },
  };

  const [failedEmails, enquiries, requests, documents, projects, owing, renewals, drafts, tasks, counts] =
    await Promise.all([
      unresolvedEmailFailures(staff).then((rows) => rows.length),
      seesEnquiries
        ? db.enquiry.findMany({
            where: enquiriesWhere,
            orderBy: { createdAt: 'asc' },
            take: EACH,
            select: { id: true, name: true, subject: true, createdAt: true },
          })
        : [],
      seesRequests
        ? db.ticket.findMany({
            where: requestsWhere,
            orderBy: { createdAt: 'asc' },
            take: EACH,
            select: { reference: true, subject: true, createdAt: true, client: { select: { name: true } } },
          })
        : [],
      seesDocuments
        ? db.document.findMany({
            where: documentsWhere,
            orderBy: { updatedAt: 'asc' },
            take: EACH,
            select: {
              reference: true,
              title: true,
              status: true,
              updatedAt: true,
              project: { select: { client: { select: { name: true } } } },
            },
          })
        : [],
      // Deals waiting on our decision, signed deals not started, and reviews
      // the client has answered. A deal with a document out is waiting on
      // them, and one sent back with changes is listed under its document.
      runsProjects
        ? db.project
            .findMany({
              where: {
                deletedAt: null,
                status: { in: ['lead', 'proposal_draft', 'proposal_accepted', 'contract_signed', 'client_review'] },
              },
              orderBy: { updatedAt: 'asc' },
              take: 40,
              select: {
                id: true,
                name: true,
                slug: true,
                status: true,
                updatedAt: true,
                client: { select: { name: true } },
                reviews: {
                  where: { status: { not: 'withdrawn' } },
                  orderBy: { round: 'desc' },
                  take: 1,
                  select: { status: true, answeredAt: true },
                },
              },
            })
            .then(numbers)
        : [],
      seesMoney
        ? db.invoice
            .findMany({
              where: { ...liveInvoice, status: { in: ['sent', 'part_paid', 'overdue'] } },
              orderBy: { dueAt: 'asc' },
              select: {
                number: true,
                currency: true,
                totalMinor: true,
                paidMinor: true,
                dueAt: true,
                client: { select: { name: true } },
              },
            })
            .then(numbers)
        : [],
      seesMoney
        ? db.renewalEvent
            .findMany({
              where: renewalsWhere,
              orderBy: { dueAt: 'asc' },
              take: EACH,
              select: {
                id: true,
                dueAt: true,
                periodStart: true,
                periodEnd: true,
                lineItem: {
                  select: {
                    label: true,
                    amountMinor: true,
                    quantity: true,
                    currency: true,
                    project: { select: { id: true, client: { select: { name: true } } } },
                  },
                },
              },
            })
            .then(numbers)
        : [],
      seesMoney
        ? db.invoice
            .findMany({
              where: draftsWhere,
              orderBy: { createdAt: 'asc' },
              take: EACH,
              select: { number: true, createdAt: true, totalMinor: true, currency: true, client: { select: { name: true } } },
            })
            .then(numbers)
        : [],
      db.deliverable
        .findMany({
          where: tasksWhere,
          orderBy: { dueAt: 'asc' },
          take: EACH,
          select: {
            id: true,
            title: true,
            dueAt: true,
            phase: { select: { project: { select: { slug: true, name: true, client: { select: { name: true } } } } } },
          },
        })
        .then(numbers),
      Promise.all([
        seesEnquiries ? db.enquiry.count({ where: enquiriesWhere }) : 0,
        seesRequests ? db.ticket.count({ where: requestsWhere }) : 0,
        seesDocuments ? db.document.count({ where: documentsWhere }) : 0,
        seesMoney ? db.renewalEvent.count({ where: renewalsWhere }) : 0,
        seesMoney ? db.invoice.count({ where: draftsWhere }) : 0,
        db.deliverable.count({ where: tasksWhere }),
      ]),
    ]);

  const deals = projects.filter((project) => {
    if (project.status !== 'client_review') return true;
    const review = project.reviews[0];
    return review !== undefined && review.status !== 'open' && review.answeredAt !== null;
  });
  const overdue = owing.filter((invoice) => invoice.totalMinor > invoice.paidMinor && isPastDay(invoice.dueAt, now));

  const rows: Row[] = [
    ...enquiries.map((enquiry) => ({
      key: `e-${enquiry.id}`,
      type: 'New enquiry',
      what: enquiry.subject,
      href: `/enquiries/${enquiry.id}`,
      client: enquiry.name,
      since: enquiry.createdAt,
      amount: null,
      action: null,
    })),
    ...requests.map((request) => ({
      key: `t-${request.reference}`,
      type: 'Request',
      what: request.subject,
      href: `/requests/${request.reference}`,
      client: request.client.name,
      since: request.createdAt,
      amount: null,
      action: null,
    })),
    ...documents.map((document) => ({
      key: `d-${document.reference}`,
      type: document.status === 'changes_requested' ? 'Changes asked for' : 'Signing time ran out',
      what: document.title,
      href: `/documents/${document.reference}`,
      client: document.project.client.name,
      since: document.updatedAt,
      amount: null,
      action: null,
    })),
    ...deals.slice(0, EACH).map((project) => {
      const review = project.status === 'client_review' ? project.reviews[0] : undefined;
      return {
        key: `p-${project.id}`,
        type: review
          ? review.status === 'approved'
            ? 'Client approved'
            : 'Changes asked for'
          : project.status === 'contract_signed'
            ? 'Agreement signed'
            : 'Deal',
        what: project.name,
        href: `/projects/${project.slug}${review ? '#review' : ''}`,
        client: project.client.name,
        since: review?.answeredAt ?? project.updatedAt,
        amount: null,
        action: project.status === 'contract_signed' ? <StartWork projectId={project.id} from={project.status} /> : null,
      };
    }),
    ...overdue.slice(0, EACH).map((invoice) => ({
      key: `i-${invoice.number}`,
      type: 'Overdue',
      what: invoice.number,
      href: `/invoices/${invoice.number}`,
      client: invoice.client.name,
      since: invoice.dueAt!,
      amount: formatMoney(invoice.totalMinor - invoice.paidMinor, invoice.currency),
      action: (
        <Link href={`/payments/new?invoice=${invoice.number}`} className={table.action}>
          Record a payment
        </Link>
      ),
    })),
    ...renewals.map((renewal) => ({
      key: `r-${renewal.id}`,
      type: 'Renewal due',
      what: `${renewal.lineItem.label}, ${periodLabel(renewal.periodStart, renewal.periodEnd)}`,
      href: '/renewals',
      client: renewal.lineItem.project.client.name,
      since: renewal.dueAt,
      amount: formatMoney(renewal.lineItem.amountMinor * renewal.lineItem.quantity, renewal.lineItem.currency),
      action: (
        <InvoiceIt
          projectId={renewal.lineItem.project.id}
          billable={`renewal:${renewal.id}`}
          dueAt={toDateInputValue(renewal.dueAt)}
        />
      ),
    })),
    ...drafts.map((invoice) => ({
      key: `x-${invoice.number}`,
      type: 'Draft, not sent',
      what: invoice.number,
      href: `/invoices/${invoice.number}`,
      client: invoice.client.name,
      since: invoice.createdAt,
      amount: formatMoney(invoice.totalMinor, invoice.currency),
      action: null,
    })),
    ...tasks.map((task) => ({
      key: `k-${task.id}`,
      type: isPastDay(task.dueAt, now) ? 'Your task, late' : 'Your task',
      what: task.title,
      href: `/projects/${task.phase.project.slug}?tab=plan`,
      client: task.phase.project.client.name,
      since: task.dueAt!,
      amount: null,
      action: <TaskDone deliverableId={task.id} title={task.title} />,
    })),
  ].sort((a, b) => a.since.getTime() - b.since.getTime());

  const [enquiryCount, requestCount, documentCount, renewalCount, draftCount, taskCount] = counts;
  const total =
    enquiryCount + requestCount + documentCount + deals.length + overdue.length + renewalCount + draftCount + taskCount;

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <h1 className={styles.heading}>
            {greeting(now)}, {staff.name.split(' ')[0]}
          </h1>
          <p className={styles.lead}>
            {total === 0 ? 'Nothing needs you.' : `${total} ${total === 1 ? 'thing needs' : 'things need'} you.`}
          </p>
        </div>
      </div>

      {failedEmails > 0 && (
        <Callout kind="bad">
          {failedEmails} {failedEmails === 1 ? 'email' : 'emails'} did not send.{' '}
          <Link href="/activity?show=failures" className={styles.inlineLink}>
            See which ones
          </Link>
        </Callout>
      )}

      <div className={table.frame}>
        <div className={table.scroll}>
          <table className={table.table}>
            <thead>
              <tr>
                <th className={table.th} scope="col">
                  Type
                </th>
                <th className={table.th} scope="col">
                  What
                </th>
                <th className={table.th} scope="col">
                  Client
                </th>
                <th className={table.th} scope="col">
                  When
                </th>
                <th className={`${table.th} ${table.numericHead}`} scope="col">
                  Amount
                </th>
                <th className={`${table.th} ${table.actionsHead}`} scope="col">
                  <span className={table.muted}>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className={table.emptyCell} colSpan={6}>
                    <p className={table.emptyTitle}>Nothing needs you right now.</p>
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.key} className={table.tr}>
                    <td className={`${table.td} ${table.nowrap}`}>{row.type}</td>
                    <td className={`${table.td} ${table.name}`}>
                      <Link href={row.href} className={table.link}>
                        {row.what}
                      </Link>
                    </td>
                    <td className={`${table.td} ${table.name}`}>
                      {row.client ?? <span className={table.muted}>None</span>}
                    </td>
                    <td className={`${table.td} ${table.nowrap}`} title={formatShortDate(row.since)}>
                      {formatRelative(row.since, now)}
                    </td>
                    <td className={`${table.td} ${table.numeric}`}>{row.amount}</td>
                    <td className={`${table.td} ${table.actions}`}>{row.action}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {total > rows.length && (
          <div className={table.footer}>
            Showing {rows.length} of {total}, oldest first.
          </div>
        )}
      </div>
    </main>
  );
}
