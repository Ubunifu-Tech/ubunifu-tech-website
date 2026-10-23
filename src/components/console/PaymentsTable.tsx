import Link from 'next/link';
import { PAYMENT_METHODS } from '@/lib/console/billing-labels';
import { formatMoney, formatShortDate } from '@/lib/console/money';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';

export type PaymentRow = {
  id: string;
  receivedAt: Date;
  amountMinor: number;
  currency: string;
  method: string;
  reference: string | null;
  receipt: { number: string } | null;
  invoice: { number: string; project: { name: string; slug: string } | null };
};

const METHOD = new Map<string, string>(PAYMENT_METHODS.map((method) => [method.value, method.label]));

/**
 * The latest payments on a client or a project, each with its receipt, for
 * the record pages. The full list, searchable, is at /payments.
 */
export function PaymentsTable({
  rows,
  total,
  allHref,
  recordHref,
  showProject = false,
}: {
  rows: PaymentRow[];
  total: number;
  allHref: string;
  /** Where Record a payment opens, with this record already chosen. */
  recordHref: string;
  showProject?: boolean;
}) {
  const columns = showProject ? 7 : 6;

  return (
    <div className={table.frame}>
      <div className={table.toolbar}>
        <div className={table.toolbarText}>
          <h2 className={table.title}>Payments</h2>
          <span className={table.count}>{total}</span>
        </div>
        <div className={table.toolbarActions}>
          {total > rows.length && (
            <Link href={allHref} className={table.link}>
              All {total}
            </Link>
          )}
          <Link href={recordHref} className={forms.button}>
            Record a payment
          </Link>
        </div>
      </div>
      <div className={table.scroll}>
        <table className={`${table.table} ${table.compact}`}>
          <thead>
            <tr>
              <th className={table.th} scope="col">
                Received
              </th>
              <th className={table.th} scope="col">
                Receipt
              </th>
              <th className={table.th} scope="col">
                Invoice
              </th>
              {showProject && (
                <th className={table.th} scope="col">
                  Project
                </th>
              )}
              <th className={table.th} scope="col">
                Method
              </th>
              <th className={table.th} scope="col">
                Reference
              </th>
              <th className={`${table.th} ${table.numericHead}`} scope="col">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className={table.emptyCell} colSpan={columns}>
                  <p className={table.emptyTitle}>No payments yet.</p>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className={table.tr}>
                  <td className={`${table.td} ${table.nowrap}`}>{formatShortDate(row.receivedAt)}</td>
                  <td className={`${table.td} ${table.nowrap}`}>
                    {row.receipt ? (
                      <Link href={`/receipts/${row.receipt.number}`} className={table.link}>
                        {row.receipt.number}
                      </Link>
                    ) : (
                      <span className={table.muted}>None</span>
                    )}
                  </td>
                  <td className={`${table.td} ${table.nowrap}`}>
                    <Link href={`/invoices/${row.invoice.number}`} className={table.link}>
                      {row.invoice.number}
                    </Link>
                  </td>
                  {showProject && (
                    <td className={`${table.td} ${table.name}`}>
                      {row.invoice.project ? (
                        <Link href={`/projects/${row.invoice.project.slug}`} className={table.link}>
                          {row.invoice.project.name}
                        </Link>
                      ) : (
                        <span className={table.muted}>None</span>
                      )}
                    </td>
                  )}
                  <td className={`${table.td} ${table.nowrap}`}>{METHOD.get(row.method) ?? row.method}</td>
                  <td className={`${table.td} ${table.nowrap}`}>
                    {row.reference ?? <span className={table.muted}>None</span>}
                  </td>
                  <td className={`${table.td} ${table.numeric}`}>
                    {formatMoney(row.amountMinor, row.currency)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
