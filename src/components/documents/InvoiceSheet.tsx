import type { Org } from '@/lib/console/org';
import { formatDate, formatMoney } from '@/lib/console/money';
import { MoneyBand, MoneyClosing, PageFurniture } from './MoneyParts';
import money from './Money.module.css';

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
  const clientName = invoice.client.legalName ?? invoice.client.name;

  return (
    <article className={money.doc}>
      <PageFurniture footer={`Invoice ${invoice.number} · ${org.legalName}`} />
      <MoneyBand
        kind="Invoice"
        number={invoice.number}
        title="Invoice for"
        accent={clientName}
        facts={[
          [
            'Billed to',
            <>
              {clientName}
              {invoice.attention && (
                <>
                  <br />
                  {invoice.attention}
                </>
              )}
            </>,
          ],
          ['Issued', invoice.issuedAt ? formatDate(invoice.issuedAt) : 'Not sent yet'],
          ['Due', invoice.dueAt ? formatDate(invoice.dueAt) : 'On receipt'],
          ...(invoice.project ? [['For', invoice.project.name] as [string, string]] : []),
        ]}
      />

      <div className={money.content}>
        <table className={money.lines}>
          <thead>
            <tr>
              <th scope="col">Description</th>
              <th scope="col" className={money.num}>
                Qty
              </th>
              <th scope="col" className={money.num}>
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((line) => (
              <tr key={line.id}>
                <td>
                  {line.label}
                  {line.description && <span className={money.lineNote}>{line.description}</span>}
                </td>
                <td className={money.num}>
                  {line.quantity > 1
                    ? `${line.quantity} × ${formatMoney(line.amountMinor, invoice.currency)}`
                    : '1'}
                </td>
                <td className={money.num}>
                  {formatMoney(line.amountMinor * line.quantity, invoice.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className={money.totals}>
          {invoice.taxMinor > 0 && (
            <>
              <p className={money.totalRow}>
                <span>Subtotal</span>
                <span>{formatMoney(invoice.subtotalMinor, invoice.currency)}</span>
              </p>
              <p className={money.totalRow}>
                <span>VAT</span>
                <span>{formatMoney(invoice.taxMinor, invoice.currency)}</span>
              </p>
            </>
          )}
          <p className={`${money.totalRow} ${money.grand}`}>
            <span>Total</span>
            <span>{formatMoney(invoice.totalMinor, invoice.currency)}</span>
          </p>
          {invoice.payments.map((payment) => (
            <p key={payment.id} className={money.totalRow}>
              <span>
                Paid {formatDate(payment.receivedAt)}
                {payment.receipt && (
                  <>
                    {', '}
                    {receiptHref ? (
                      <a href={receiptHref(payment.receipt.number)}>{payment.receipt.number}</a>
                    ) : (
                      payment.receipt.number
                    )}
                  </>
                )}
              </span>
              <span>−{formatMoney(payment.amountMinor, payment.currency)}</span>
            </p>
          ))}
        </div>

        <div className={owed === 0 ? money.amount : `${money.amount} ${money.amountDue}`}>
          <p className={money.amountLabel}>{owed === 0 ? 'Paid in full. Thank you.' : 'Amount due'}</p>
          <p className={money.amountFigure}>{formatMoney(owed, invoice.currency)}</p>
        </div>

        {owed > 0 && (org.bankAccountNumber || org.mobileMoneyNumber) && (
          <section className={money.pay}>
            <h2 className={money.sectionTitle}>How to pay</h2>
            <div className={money.payWays}>
              {org.bankAccountNumber && (
                <div className={money.payWay}>
                  <p className={money.payWayTitle}>Bank transfer</p>
                  <dl>
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
                  </dl>
                </div>
              )}
              {org.mobileMoneyNumber && (
                <div className={money.payWay}>
                  <p className={money.payWayTitle}>Mobile money</p>
                  <dl>
                    {org.mobileMoneyName && (
                      <div>
                        <dt>Name</dt>
                        <dd>{org.mobileMoneyName}</dd>
                      </div>
                    )}
                    <div>
                      <dt>Number</dt>
                      <dd>{org.mobileMoneyNumber}</dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>
            <p className={money.note}>Please use {invoice.number} as the payment reference.</p>
          </section>
        )}

        {(invoice.notes || org.invoiceFooter) && (
          <p className={money.foot}>
            {invoice.notes}
            {invoice.notes && org.invoiceFooter ? ' ' : ''}
            {org.invoiceFooter}
          </p>
        )}

        <MoneyClosing org={org} />
      </div>
    </article>
  );
}
