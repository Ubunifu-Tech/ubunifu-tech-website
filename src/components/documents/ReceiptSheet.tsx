import { PAYMENT_METHODS } from '@/lib/console/billing-labels';
import type { Org } from '@/lib/console/org';
import { formatDate, formatMoney } from '@/lib/console/money';
import { MoneyBand, MoneyClosing, PageFurniture } from './MoneyParts';
import money from './Money.module.css';

export type ReceiptSheetData = {
  number: string;
  issuedAt: Date;
  payment: {
    amountMinor: number;
    currency: string;
    method: string;
    reference: string | null;
    receivedAt: Date;
    reversedAt: Date | null;
    reversalReason: string | null;
    refunds: { number: string; amountMinor: number; currency: string; refundedAt: Date }[];
    recordedBy?: { name: string } | null;
    invoice: {
      number: string;
      totalMinor: number;
      paidMinor: number;
      currency: string;
      client: { name: string; legalName: string | null; country: string };
      project: { name: string } | null;
    };
  };
};

/**
 * A receipt: proof that a payment reached us. One sheet for staff and client
 * alike, so what staff print is exactly what the client holds. A reversed
 * payment keeps its receipt, marked cancelled, rather than losing it.
 */
export function ReceiptSheet({
  receipt,
  org,
  invoiceHref,
}: {
  receipt: ReceiptSheetData;
  org: Org;
  /** Where the invoice number links to, for whoever is looking. */
  invoiceHref?: string;
}) {
  const { payment } = receipt;
  const { invoice } = payment;
  const clientName = invoice.client.legalName ?? invoice.client.name;
  const methodLabel =
    PAYMENT_METHODS.find((method) => method.value === payment.method)?.label ?? payment.method;
  const stillOwed = Math.max(0, invoice.totalMinor - invoice.paidMinor);

  return (
    <article className={money.doc}>
      <PageFurniture footer={`Receipt ${receipt.number} · ${org.legalName}`} />
      <MoneyBand
        kind="Receipt"
        number={receipt.number}
        title="Payment received from"
        accent={clientName}
        facts={[
          ['Received from', `${clientName}, ${invoice.client.country}`],
          ['Issued', formatDate(receipt.issuedAt)],
          ['For', invoice.project ? invoice.project.name : 'Services rendered'],
        ]}
      />

      <div className={money.content}>
        {payment.reversedAt && (
          <p className={money.cancelled} role="note">
            <span className={money.cancelledTitle}>Cancelled on {formatDate(payment.reversedAt)}</span>
            This payment was reversed, so this receipt is no longer proof of payment.
            {payment.reversalReason ? ` Reason: ${payment.reversalReason}` : ''}
          </p>
        )}

        <table className={money.details}>
          <tbody>
            <tr>
              <th scope="row">Date received</th>
              <td>{formatDate(payment.receivedAt)}</td>
            </tr>
            <tr>
              <th scope="row">Method</th>
              <td>{methodLabel}</td>
            </tr>
            {payment.reference && (
              <tr>
                <th scope="row">Reference</th>
                <td>{payment.reference}</td>
              </tr>
            )}
            {payment.refunds.map((refund) => (
              <tr key={refund.number}>
                <th scope="row">Refunded, {refund.number}</th>
                <td>
                  {formatMoney(refund.amountMinor, refund.currency)} on {formatDate(refund.refundedAt)}
                </td>
              </tr>
            ))}
            <tr>
              <th scope="row">Against invoice</th>
              <td>{invoiceHref ? <a href={invoiceHref}>{invoice.number}</a> : invoice.number}</td>
            </tr>
            <tr>
              <th scope="row">Invoice total</th>
              <td>{formatMoney(invoice.totalMinor, invoice.currency)}</td>
            </tr>
            <tr>
              <th scope="row">{stillOwed === 0 ? 'Balance' : 'Balance remaining'}</th>
              <td>{stillOwed === 0 ? 'Paid in full' : formatMoney(stillOwed, invoice.currency)}</td>
            </tr>
          </tbody>
        </table>

        <div className={payment.reversedAt ? `${money.amount} ${money.amountVoid}` : money.amount}>
          <p className={money.amountLabel}>
            {payment.reversedAt ? 'Amount recorded, then reversed' : 'Amount received, with thanks'}
          </p>
          <p className={money.amountFigure}>{formatMoney(payment.amountMinor, payment.currency)}</p>
        </div>

        <p className={money.foot}>
          This receipt confirms a payment recorded against invoice {invoice.number}. It is issued by{' '}
          {org.legalName} and is valid without a signature.
          {payment.recordedBy ? ` Recorded by ${payment.recordedBy.name}.` : ''}
        </p>

        <MoneyClosing org={org} />
      </div>
    </article>
  );
}
