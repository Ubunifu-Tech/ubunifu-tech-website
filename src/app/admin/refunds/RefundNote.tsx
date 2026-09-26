import { PAYMENT_METHODS } from '@/lib/console/billing-labels';
import { formatDate, formatMoney } from '@/lib/console/money';
import type { Org } from '@/lib/console/org';
import { MoneyBand, MoneyClosing, PageFurniture } from '@/components/documents/MoneyParts';
import money from '@/components/documents/Money.module.css';

export type RefundNoteData = {
  number: string;
  amountMinor: number;
  currency: string;
  method: string;
  reference: string | null;
  refundedAt: Date;
  reason: string;
  recordedBy?: { name: string } | null;
  payment: {
    amountMinor: number;
    receivedAt: Date;
    receipt: { number: string } | null;
    invoice: {
      number: string;
      client: { name: string; legalName: string | null; country: string };
      project: { name: string } | null;
    };
  };
};

/**
 * The refund note: proof that money went back to the client.
 *
 * One document for staff and client alike, as with receipts, so what staff
 * see is exactly what the client holds. It stands beside the receipt for the
 * payment it came from rather than replacing it: that money did arrive.
 */
export function RefundNote({
  refund,
  org,
}: {
  refund: RefundNoteData;
  org: Org;
}) {
  const { payment } = refund;
  const { invoice } = payment;
  const clientName = invoice.client.legalName ?? invoice.client.name;
  const methodLabel =
    PAYMENT_METHODS.find((method) => method.value === refund.method)?.label ?? refund.method;

  return (
    <article className={money.doc}>
      <PageFurniture footer={`Refund note ${refund.number} · ${org.legalName}`} />
      <MoneyBand
        kind="Refund note"
        number={refund.number}
        title="Money sent back to"
        accent={clientName}
        facts={[
          ['Refunded to', `${clientName}, ${invoice.client.country}`],
          ['Date', formatDate(refund.refundedAt)],
          ['For', invoice.project ? invoice.project.name : 'Services rendered'],
        ]}
      />

      <div className={money.content}>
        <table className={money.details}>
          <tbody>
            <tr>
              <th scope="row">Date sent back</th>
              <td>{formatDate(refund.refundedAt)}</td>
            </tr>
            <tr>
              <th scope="row">Method</th>
              <td>{methodLabel}</td>
            </tr>
            {refund.reference && (
              <tr>
                <th scope="row">Reference</th>
                <td>{refund.reference}</td>
              </tr>
            )}
            <tr>
              <th scope="row">From the payment</th>
              <td>
                {formatMoney(payment.amountMinor, refund.currency)} received{' '}
                {formatDate(payment.receivedAt)}
                {payment.receipt ? `, receipt ${payment.receipt.number}` : ''}
              </td>
            </tr>
            <tr>
              <th scope="row">Against invoice</th>
              <td>{invoice.number}</td>
            </tr>
            <tr>
              <th scope="row">Reason</th>
              <td>{refund.reason}</td>
            </tr>
          </tbody>
        </table>

        <div className={`${money.amount} ${money.amountDue}`}>
          <p className={money.amountLabel}>Amount sent back</p>
          <p className={money.amountFigure}>{formatMoney(refund.amountMinor, refund.currency)}</p>
        </div>

        <p className={money.foot}>
          This note confirms money sent back from a payment against invoice {invoice.number}. It is
          issued by {org.legalName} and is valid without a signature.
          {refund.recordedBy ? ` Recorded by ${refund.recordedBy.name}.` : ''}
        </p>

        <MoneyClosing org={org} />
      </div>
    </article>
  );
}
