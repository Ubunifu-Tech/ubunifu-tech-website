import Link from 'next/link';
import { INVOICE_STATUS_LABEL, invoiceStanding } from '@/lib/console/billing-labels';
import { formatMoney, formatShortDate, isPastDay } from '@/lib/console/money';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';

export type InvoiceRow = {
  id: string;
  number: string;
  status: string;
  issuedAt: Date | null;
  dueAt: Date | null;
  totalMinor: number;
  paidMinor: number;
  refundedMinor: number;
  currency: string;
  project: { name: string; slug: string } | null;
};

const STATUS_BADGE: Record<string, string> = {
  draft: '',
  sent: forms.badgeLive,
  part_paid: forms.badgeWarn,
  paid: forms.badgeGood,
  overdue: forms.badgeBad,
  void: '',
};

/**
 * A client's latest invoices on their own page, and the place to raise the
 * next one. The full list, searchable, is at /invoices.
 */
export function InvoicesTable({
  rows,
  total,
  allHref,
  raiseHref,
  ready,
  now,
}: {
  rows: InvoiceRow[];
  total: number;
  allHref: string;
  /** Where Raise an invoice opens, with this client already chosen. */
  raiseHref: string;
  /** What can be invoiced now, said beside the count. Empty when nothing can. */
  ready: string;
  now: Date;
}) {
  return (
    <div className={table.frame}>
      <div className={table.toolbar}>
        <div className={table.toolbarText}>
          <h2 className={table.title}>Invoices</h2>
          <span className={table.count}>{total}</span>
          {ready && <span className={table.muted}>{ready} ready to invoice</span>}
        </div>
        <div className={table.toolbarActions}>
          {total > rows.length && (
            <Link href={allHref} className={table.link}>
              All {total}
            </Link>
          )}
          <Link href={raiseHref} className={forms.button}>
            Raise an invoice
          </Link>
        </div>
      </div>
      <div className={table.scroll}>
        <table className={`${table.table} ${table.compact}`}>
          <thead>
            <tr>
              <th className={table.th} scope="col">
                Invoice
              </th>
              <th className={table.th} scope="col">
                Project
              </th>
              <th className={table.th} scope="col">
                State
              </th>
              <th className={table.th} scope="col">
                Due
              </th>
              <th className={`${table.th} ${table.numericHead}`} scope="col">
                Total
              </th>
              <th className={`${table.th} ${table.numericHead}`} scope="col">
                Outstanding
              </th>
              <th className={`${table.th} ${table.actionsHead}`} scope="col">
                <span className={table.muted}>Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className={table.emptyCell} colSpan={7}>
                  <p className={table.emptyTitle}>No invoices yet.</p>
                  <p className={table.emptyHint}>
                    {ready
                      ? 'Raise an invoice to bill the fees that are ready.'
                      : 'An invoice is raised from a project’s fees, once a fee has a price.'}
                  </p>
                </td>
              </tr>
            ) : (
              rows.map((invoice) => {
                const standing = invoiceStanding(invoice, now);
                const owed =
                  invoice.status === 'void' ? 0 : Math.max(0, invoice.totalMinor - invoice.paidMinor);
                const late = owed > 0 && invoice.status !== 'draft' && isPastDay(invoice.dueAt, now);
                return (
                  <tr key={invoice.id} className={table.tr}>
                    <td className={`${table.td} ${table.primary} ${table.nowrap}`}>
                      <Link href={`/invoices/${invoice.number}`} className={table.link}>
                        {invoice.number}
                      </Link>
                      <span className={table.sub}>
                        {invoice.issuedAt ? `Issued ${formatShortDate(invoice.issuedAt)}` : 'Not sent yet'}
                      </span>
                    </td>
                    <td className={`${table.td} ${table.name}`}>
                      {invoice.project ? (
                        <Link href={`/projects/${invoice.project.slug}`} className={table.link}>
                          {invoice.project.name}
                        </Link>
                      ) : (
                        <span className={table.muted}>No project</span>
                      )}
                    </td>
                    <td className={table.td}>
                      <span className={`${forms.badge} ${STATUS_BADGE[standing] ?? ''}`}>
                        {invoice.status === 'paid' &&
                        invoice.paidMinor > 0 &&
                        invoice.refundedMinor >= invoice.paidMinor
                          ? 'Refunded'
                          : (INVOICE_STATUS_LABEL[standing] ?? standing)}
                      </span>
                    </td>
                    <td
                      className={`${table.td} ${table.nowrap} ${late ? table.late : ''}`}
                      title={late ? 'Past due' : undefined}
                    >
                      {formatShortDate(invoice.dueAt)}
                    </td>
                    <td className={`${table.td} ${table.numeric}`}>
                      {formatMoney(invoice.totalMinor, invoice.currency)}
                    </td>
                    <td className={`${table.td} ${table.numeric}`}>
                      {invoice.status === 'void' ? (
                        <span className={table.muted}>Void</span>
                      ) : owed === 0 ? (
                        <span className={table.muted}>Paid</span>
                      ) : (
                        formatMoney(owed, invoice.currency)
                      )}
                    </td>
                    <td className={`${table.td} ${table.actions}`}>
                      {invoice.status === 'draft' ? (
                        <Link href={`/invoices/${invoice.number}`} className={table.action}>
                          Review and send
                        </Link>
                      ) : (
                        owed > 0 && (
                          <Link href={`/payments/new?invoice=${invoice.number}`} className={table.action}>
                            Record a payment
                          </Link>
                        )
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
