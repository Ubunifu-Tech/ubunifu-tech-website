import React from 'react';
import Link from 'next/link';
import { db } from '@/lib/db';
import { requireClient } from '@/lib/console/auth';
import { liveInvoice, sentToClient } from '@/lib/console/live';
import { INVOICE_STATUS_LABEL } from '@/lib/console/billing-labels';
import { formatMoney, formatShortDate } from '@/lib/console/money';
import styles from '../Portal.module.css';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';

export const metadata = { title: 'Invoices and receipts' };

const STATUS_BADGE: Record<string, string> = {
  sent: forms.badgeLive,
  part_paid: forms.badgeWarn,
  paid: forms.badgeGood,
  overdue: forms.badgeBad,
};

/**
 * The client's own money.
 *
 * Drafts are absent: a draft is a document we have not asked them for yet,
 * and showing one would have them paying against something that may still
 * change. A cancelled invoice we had sent stays, marked, with nothing owed. Receipts sit in the same table as the invoice they
 * answer, because "did I pay that" and "prove I paid that" are one question.
 */
export default async function PortalInvoices() {
  const actor = await requireClient();

  const invoices = await db.invoice.findMany({
    where: {
      clientId: actor.clientId,
      ...liveInvoice,
      ...sentToClient,
    },
    orderBy: [{ issuedAt: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      number: true,
      status: true,
      currency: true,
      totalMinor: true,
      paidMinor: true,
      issuedAt: true,
      dueAt: true,
      project: { select: { name: true, slug: true } },
      payments: {
        orderBy: { receivedAt: 'desc' },
        select: {
          id: true,
          amountMinor: true,
          currency: true,
          receivedAt: true,
          reversedAt: true,
          receipt: { select: { number: true } },
          refunds: {
            orderBy: { refundedAt: 'asc' },
            select: { id: true, number: true, amountMinor: true, currency: true, refundedAt: true },
          },
        },
      },
    },
  });

  const owedByCurrency = new Map<string, number>();
  // Nothing is owed on a cancelled invoice, whatever its figures say.
  const owedOn = (invoice: (typeof invoices)[number]) =>
    invoice.status === 'void' ? 0 : Math.max(0, invoice.totalMinor - invoice.paidMinor);
  for (const invoice of invoices) {
    const owed = owedOn(invoice);
    if (owed > 0) {
      owedByCurrency.set(invoice.currency, (owedByCurrency.get(invoice.currency) ?? 0) + owed);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <h1 className={styles.heading}>
          Invoices and <span className={styles.headingAccent}>receipts</span>
        </h1>
        <p className={styles.lead}>
          {owedByCurrency.size === 0
            ? 'Nothing outstanding. Everything we have invoiced has been received.'
            : `${[...owedByCurrency].map(([currency, owed]) => formatMoney(owed, currency)).join(' and ')} outstanding.`}
        </p>
      </div>

      <div className={table.frame}>
        <div className={table.toolbar}>
          <div className={table.toolbarText}>
            <h2 className={table.title}>Everything we have invoiced</h2>
            <span className={table.count}>
              {invoices.length} {invoices.length === 1 ? 'invoice' : 'invoices'}
            </span>
          </div>
        </div>

        <div className={table.scroll}>
          <table className={table.table}>
            <thead>
              <tr>
                <th className={table.th} scope="col">
                  Invoice
                </th>
                <th className={table.th} scope="col">
                  For
                </th>
                <th className={table.th} scope="col">
                  Issued
                </th>
                <th className={table.th} scope="col">
                  Due
                </th>
                <th className={table.th} scope="col">
                  State
                </th>
                <th className={`${table.th} ${table.numericHead}`} scope="col">
                  Total
                </th>
                <th className={`${table.th} ${table.numericHead}`} scope="col">
                  Outstanding
                </th>
                <th className={table.th} scope="col">
                  Receipts
                </th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td className={table.emptyCell} colSpan={8}>
                    <p className={table.emptyTitle}>Nothing invoiced yet.</p>
                    <p className={table.emptyHint}>
                      Anything we send you will appear here, along with a receipt once it is paid.
                    </p>
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => {
                  const owed = owedOn(invoice);
                  return (
                    <tr key={invoice.id} className={table.tr}>
                      <td className={`${table.td} ${table.primary} ${table.nowrap}`}>
                        <Link href={`/portal/invoices/${invoice.number}`} className={table.link}>
                          {invoice.number}
                        </Link>
                      </td>
                      <td className={table.td}>
                        {invoice.project ? (
                          <Link
                            href={`/portal/projects/${invoice.project.slug}`}
                            className={table.link}
                          >
                            {invoice.project.name}
                          </Link>
                        ) : (
                          <span className={table.muted}>Services</span>
                        )}
                      </td>
                      <td className={`${table.td} ${table.nowrap}`}>
                        {formatShortDate(invoice.issuedAt)}
                      </td>
                      <td className={`${table.td} ${table.nowrap}`}>
                        {formatShortDate(invoice.dueAt)}
                      </td>
                      <td className={table.td}>
                        <span className={`${forms.badge} ${STATUS_BADGE[invoice.status] ?? ''}`}>
                          {invoice.status === 'void'
                            ? 'Cancelled'
                            : INVOICE_STATUS_LABEL[invoice.status]}
                        </span>
                      </td>
                      <td className={`${table.td} ${table.numeric}`}>
                        {formatMoney(invoice.totalMinor, invoice.currency)}
                      </td>
                      <td className={`${table.td} ${table.numeric}`}>
                        {owed === 0 ? (
                          <span className={table.muted}>Nothing</span>
                        ) : (
                          formatMoney(owed, invoice.currency)
                        )}
                      </td>
                      <td className={table.td}>
                        {invoice.payments.length === 0 ? (
                          <span className={table.muted}>None yet</span>
                        ) : (
                          invoice.payments.map((payment) => (
                            <React.Fragment key={payment.id}>
                              <span className={table.sub}>
                                {payment.receipt ? (
                                  <Link href={`/portal/receipts/${payment.receipt.number}`}>
                                    {payment.receipt.number}
                                  </Link>
                                ) : (
                                  formatMoney(payment.amountMinor, payment.currency)
                                )}{' '}
                                · {formatShortDate(payment.receivedAt)}
                                {payment.reversedAt ? ' · cancelled' : ''}
                              </span>
                              {payment.refunds.map((refund) => (
                                <span key={refund.id} className={table.sub}>
                                  <Link href={`/portal/refunds/${refund.number}`}>
                                    {refund.number}
                                  </Link>{' '}
                                  · {formatMoney(refund.amountMinor, refund.currency)} sent back{' '}
                                  {formatShortDate(refund.refundedAt)}
                                </span>
                              ))}
                            </React.Fragment>
                          ))
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
    </main>
  );
}
