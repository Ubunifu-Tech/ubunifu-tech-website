import React from 'react';
import { BrandMark } from '@/components/BrandMark';
import { PAYMENT_METHODS } from '@/lib/console/billing-labels';
import { formatDate, formatMoney } from '@/lib/console/money';
import sheet from '../receipts/Receipt.module.css';

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
  org: { legalName: string; addressLines: string | null; email: string; tin: string | null };
}) {
  const { payment } = refund;
  const { invoice } = payment;
  const methodLabel =
    PAYMENT_METHODS.find((method) => method.value === refund.method)?.label ?? refund.method;

  return (
    <article className={sheet.sheet}>
      <header className={sheet.head}>
        <div className={sheet.issuer}>
          <BrandMark className={sheet.mark} title="Ubunifu Technologies" />
          <p className={sheet.issuerName}>
            {org.legalName}
            {org.addressLines && (
              <span className={sheet.issuerLine}>{org.addressLines.split('\n').join(', ')}</span>
            )}
            <span className={sheet.issuerLine}>{org.email}</span>
            {org.tin && <span className={sheet.issuerLine}>TIN {org.tin}</span>}
          </p>
        </div>
        <div className={sheet.docType}>
          <p className={sheet.docLabel}>Refund note</p>
          <p className={sheet.docNumber}>{refund.number}</p>
        </div>
      </header>

      <div className={sheet.parties}>
        <div>
          <p className={sheet.partyLabel}>Refunded to</p>
          <p className={sheet.partyValue}>
            {invoice.client.legalName ?? invoice.client.name}
            <br />
            {invoice.client.country}
          </p>
        </div>
        <div>
          <p className={sheet.partyLabel}>Date</p>
          <p className={sheet.partyValue}>{formatDate(refund.refundedAt)}</p>
        </div>
        <div>
          <p className={sheet.partyLabel}>For</p>
          <p className={sheet.partyValue}>
            {invoice.project ? invoice.project.name : 'Services rendered'}
          </p>
        </div>
      </div>

      <div className={`${sheet.amountBlock} ${sheet.amountBlockOut}`}>
        <p className={sheet.amountLabel}>Amount sent back</p>
        <p className={sheet.amount}>{formatMoney(refund.amountMinor, refund.currency)}</p>
      </div>

      <table className={sheet.detailTable}>
        <tbody>
          <tr>
            <th className={sheet.detailKey} scope="row">
              Date sent back
            </th>
            <td className={sheet.detailValue}>{formatDate(refund.refundedAt)}</td>
          </tr>
          <tr>
            <th className={sheet.detailKey} scope="row">
              Method
            </th>
            <td className={sheet.detailValue}>{methodLabel}</td>
          </tr>
          {refund.reference && (
            <tr>
              <th className={sheet.detailKey} scope="row">
                Reference
              </th>
              <td className={sheet.detailValue}>{refund.reference}</td>
            </tr>
          )}
          <tr>
            <th className={sheet.detailKey} scope="row">
              From the payment
            </th>
            <td className={sheet.detailValue}>
              {formatMoney(payment.amountMinor, refund.currency)} received{' '}
              {formatDate(payment.receivedAt)}
              {payment.receipt ? `, receipt ${payment.receipt.number}` : ''}
            </td>
          </tr>
          <tr>
            <th className={sheet.detailKey} scope="row">
              Against invoice
            </th>
            <td className={sheet.detailValue}>{invoice.number}</td>
          </tr>
          <tr>
            <th className={sheet.detailKey} scope="row">
              Reason
            </th>
            <td className={sheet.detailValue}>{refund.reason}</td>
          </tr>
        </tbody>
      </table>

      <p className={sheet.foot}>
        This note confirms money sent back from a payment against invoice {invoice.number}. It is
        issued by {org.legalName} and is valid without a signature.
        {refund.recordedBy ? ` Recorded by ${refund.recordedBy.name}.` : ''}
      </p>
    </article>
  );
}
