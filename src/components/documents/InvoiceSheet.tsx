import { BrandMark } from '@/components/BrandMark';
import type { Org } from '@/lib/console/org';
import { formatDate, formatMoney } from '@/lib/console/money';
import sheet from '@/app/admin/receipts/Receipt.module.css';

/**
 * An invoice as the client receives it, on screen and on paper. The client's
 * portal and the staff print view render this same sheet, so what staff print
 * is exactly what the client sees. It carries only what a client needs: who
 * it is from and to, what it is for, what is owed and how to pay.
 */

export type InvoiceSheetData = {
  number: string;
  issuedAt: Date | null;
  dueAt: Date | null;
  currency: string;
  subtotalMinor: number;
  taxMinor: number;
  totalMinor: number;
  paidMinor: number;
  notes: string | null;
  client: { name: string; legalName: string | null; country: string };
  attention: string | null;
  project: { name: string } | null;
  lines: { id: string; label: string; description: string | null; amountMinor: number; quantity: number }[];
  payments: { id: string; amountMinor: number; currency: string; receivedAt: Date; receipt: { number: string } | null }[];
};

export function InvoiceSheet({
  invoice,
  org,
  receiptHref,
}: {
  invoice: InvoiceSheetData;
  org: Org;
  /** Where a receipt number links to, for whoever is looking. */
  receiptHref?: (number: string) => string;
}) {
  const owed = Math.max(0, invoice.totalMinor - invoice.paidMinor);

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
            <span className={sheet.issuerLine}>
              {org.email}
              {org.phone ? ` · ${org.phone}` : ''}
            </span>
            {org.tin && <span className={sheet.issuerLine}>TIN {org.tin}</span>}
            {invoice.taxMinor > 0 && org.vrn && <span className={sheet.issuerLine}>VRN {org.vrn}</span>}
          </p>
        </div>
        <div className={sheet.docType}>
          <p className={sheet.docLabel}>Invoice</p>
          <p className={sheet.docNumber}>{invoice.number}</p>
        </div>
      </header>

      <div className={sheet.parties}>
        <div>
          <p className={sheet.partyLabel}>Billed to</p>
          <p className={sheet.partyValue}>
            {invoice.client.legalName ?? invoice.client.name}
            {invoice.attention && (
              <>
                <br />
                {invoice.attention}
              </>
            )}
          </p>
        </div>
        <div>
          <p className={sheet.partyLabel}>Issued</p>
          <p className={sheet.partyValue}>{invoice.issuedAt ? formatDate(invoice.issuedAt) : 'Not sent yet'}</p>
        </div>
        <div>
          <p className={sheet.partyLabel}>Due</p>
          <p className={sheet.partyValue}>{invoice.dueAt ? formatDate(invoice.dueAt) : 'On receipt'}</p>
        </div>
        {invoice.project && (
          <div>
            <p className={sheet.partyLabel}>For</p>
            <p className={sheet.partyValue}>{invoice.project.name}</p>
          </div>
        )}
      </div>

      <table className={sheet.lineTable}>
        <thead>
          <tr>
            <th scope="col">Description</th>
            <th scope="col" className={sheet.num}>
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((line) => (
            <tr key={line.id}>
              <td>
                {line.label}
                {line.description && <span className={sheet.lineNote}>{line.description}</span>}
              </td>
              <td className={sheet.num}>
                {line.quantity > 1 && (
                  <span className={sheet.lineNote}>
                    {line.quantity} × {formatMoney(line.amountMinor, invoice.currency)}
                  </span>
                )}
                {formatMoney(line.amountMinor * line.quantity, invoice.currency)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          {invoice.taxMinor > 0 && (
            <>
              <tr>
                <th scope="row">Subtotal</th>
                <td className={sheet.num}>{formatMoney(invoice.subtotalMinor, invoice.currency)}</td>
              </tr>
              <tr>
                <th scope="row">VAT</th>
                <td className={sheet.num}>{formatMoney(invoice.taxMinor, invoice.currency)}</td>
              </tr>
            </>
          )}
          <tr className={sheet.totalRow}>
            <th scope="row">Total</th>
            <td className={sheet.num}>{formatMoney(invoice.totalMinor, invoice.currency)}</td>
          </tr>
          {invoice.payments.map((payment) => (
            <tr key={payment.id}>
              <th scope="row">
                Paid {formatDate(payment.receivedAt)}
                {payment.receipt && (
                  <span className={sheet.lineNote}>
                    {receiptHref ? (
                      <a href={receiptHref(payment.receipt.number)}>Receipt {payment.receipt.number}</a>
                    ) : (
                      `Receipt ${payment.receipt.number}`
                    )}
                  </span>
                )}
              </th>
              <td className={sheet.num}>−{formatMoney(payment.amountMinor, payment.currency)}</td>
            </tr>
          ))}
        </tfoot>
      </table>

      <div className={owed === 0 ? sheet.amountBlock : `${sheet.amountBlock} ${sheet.amountDue}`}>
        <p className={sheet.amountLabel}>{owed === 0 ? 'Paid in full. Thank you.' : 'Amount due'}</p>
        <p className={sheet.amount}>{formatMoney(owed, invoice.currency)}</p>
      </div>

      {owed > 0 && (org.bankAccountNumber || org.mobileMoneyNumber) && (
        <section className={sheet.payBlock}>
          <p className={sheet.partyLabel}>How to pay</p>
          <dl className={sheet.payList}>
            {org.bankAccountNumber && (
              <>
                {org.bankName && (
                  <div>
                    <dt>Bank</dt>
                    <dd>{org.bankName}</dd>
                  </div>
                )}
                <div>
                  <dt>Account name</dt>
                  <dd>{org.bankAccountName ?? org.legalName}</dd>
                </div>
                <div>
                  <dt>Account number</dt>
                  <dd>{org.bankAccountNumber}</dd>
                </div>
                {org.bankSwift && (
                  <div>
                    <dt>SWIFT</dt>
                    <dd>{org.bankSwift}</dd>
                  </div>
                )}
              </>
            )}
            {org.mobileMoneyNumber && (
              <div>
                <dt>Mobile money</dt>
                <dd>
                  {org.mobileMoneyName ? `${org.mobileMoneyName}, ` : ''}
                  {org.mobileMoneyNumber}
                </dd>
              </div>
            )}
          </dl>
          <p className={sheet.payNote}>Please use {invoice.number} as the payment reference.</p>
        </section>
      )}

      {(invoice.notes || org.invoiceFooter) && (
        <p className={sheet.foot}>
          {invoice.notes}
          {invoice.notes && org.invoiceFooter ? ' ' : ''}
          {org.invoiceFooter}
        </p>
      )}
    </article>
  );
}
