import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { BrandMark } from '@/components/BrandMark';
import { requireStaff } from '@/lib/console/auth';
import { PAYMENT_METHODS } from '@/lib/console/billing-labels';
import { formatDate, formatMoney } from '@/lib/console/money';
import { EmailReceiptButton } from '../../invoices/InvoiceControls';
import { PrintButton } from '../PrintButton';
import styles from '../../Admin.module.css';
import sheet from '../Receipt.module.css';

export async function generateMetadata({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  return { title: `Receipt ${decodeURIComponent(number)}` };
}

/**
 * The receipt.
 *
 * Deliberately the same document staff see and the client receives — there is
 * no second, prettier version for sending. What is on screen is what prints,
 * which is the only way the two can never disagree.
 */
export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  await requireStaff();
  const { number } = await params;

  const receipt = await db.receipt.findUnique({
    where: { number: decodeURIComponent(number) },
    select: {
      id: true,
      number: true,
      issuedAt: true,
      payment: {
        select: {
          amountMinor: true,
          currency: true,
          method: true,
          reference: true,
          receivedAt: true,
          note: true,
          recordedBy: { select: { name: true } },
          invoice: {
            select: {
              number: true,
              totalMinor: true,
              paidMinor: true,
              currency: true,
              client: { select: { name: true, legalName: true, slug: true, country: true } },
              project: { select: { name: true, reference: true, slug: true } },
            },
          },
        },
      },
    },
  });

  if (!receipt) notFound();

  const { payment } = receipt;
  const { invoice } = payment;
  const methodLabel =
    PAYMENT_METHODS.find((method) => method.value === payment.method)?.label ?? payment.method;
  const stillOwed = Math.max(0, invoice.totalMinor - invoice.paidMinor);

  return (
    <main className={styles.page}>
      <div className={sheet.toolbar}>
        <Link href={`/invoices/${invoice.number}`} className={styles.backLink}>
          ← {invoice.number}
        </Link>
        <PrintButton />
        <EmailReceiptButton receiptId={receipt.id} />
      </div>

      <article className={sheet.sheet}>
        <header className={sheet.head}>
          <div className={sheet.issuer}>
            <BrandMark className={sheet.mark} title="Ubunifu Technologies" />
            <p className={sheet.issuerName}>
              Ubunifu Technologies
              <span className={sheet.issuerLine}>Tanzania</span>
              <span className={sheet.issuerLine}>info@ubunifutech.com</span>
            </p>
          </div>
          <div className={sheet.docType}>
            <p className={sheet.docLabel}>Receipt</p>
            <p className={sheet.docNumber}>{receipt.number}</p>
          </div>
        </header>

        <div className={sheet.parties}>
          <div>
            <p className={sheet.partyLabel}>Received from</p>
            <p className={sheet.partyValue}>
              {invoice.client.legalName ?? invoice.client.name}
              <br />
              {invoice.client.country}
            </p>
          </div>
          <div>
            <p className={sheet.partyLabel}>Issued</p>
            <p className={sheet.partyValue}>{formatDate(receipt.issuedAt)}</p>
          </div>
          <div>
            <p className={sheet.partyLabel}>For</p>
            <p className={sheet.partyValue}>
              {invoice.project ? (
                <>
                  {invoice.project.name}
                  <br />
                  {invoice.project.reference}
                </>
              ) : (
                'Services rendered'
              )}
            </p>
          </div>
        </div>

        <div className={sheet.amountBlock}>
          <p className={sheet.amountLabel}>Amount received, with thanks</p>
          <p className={sheet.amount}>{formatMoney(payment.amountMinor, payment.currency)}</p>
        </div>

        <table className={sheet.detailTable}>
          <tbody>
            <tr>
              <th className={sheet.detailKey} scope="row">Date received</th>
              <td className={sheet.detailValue}>{formatDate(payment.receivedAt)}</td>
            </tr>
            <tr>
              <th className={sheet.detailKey} scope="row">Method</th>
              <td className={sheet.detailValue}>{methodLabel}</td>
            </tr>
            {payment.reference && (
              <tr>
                <th className={sheet.detailKey} scope="row">Reference</th>
                <td className={sheet.detailValue}>{payment.reference}</td>
              </tr>
            )}
            <tr>
              <th className={sheet.detailKey} scope="row">Against invoice</th>
              <td className={sheet.detailValue}>{invoice.number}</td>
            </tr>
            <tr>
              <th className={sheet.detailKey} scope="row">Invoice total</th>
              <td className={sheet.detailValue}>
                {formatMoney(invoice.totalMinor, invoice.currency)}
              </td>
            </tr>
            <tr>
              <th className={sheet.detailKey} scope="row">
                {stillOwed === 0 ? 'Balance' : 'Balance remaining'}
              </th>
              <td className={sheet.detailValue}>
                {stillOwed === 0
                  ? 'Paid in full'
                  : formatMoney(stillOwed, invoice.currency)}
              </td>
            </tr>
          </tbody>
        </table>

        <p className={sheet.foot}>
          This receipt confirms a payment recorded against invoice {invoice.number}. It is issued
          by Ubunifu Technologies and is valid without a signature.
          {payment.recordedBy ? ` Recorded by ${payment.recordedBy.name}.` : ''}
        </p>
      </article>
    </main>
  );
}
