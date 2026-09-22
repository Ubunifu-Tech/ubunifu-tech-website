import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { BrandMark } from '@/components/BrandMark';
import { requireClient } from '@/lib/console/auth';
import { PAYMENT_METHODS } from '@/lib/console/billing-labels';
import { getOrg } from '@/lib/console/org';
import { formatDate, formatMoney } from '@/lib/console/money';
import { PrintButton } from '@/app/admin/receipts/PrintButton';
import styles from '../../Portal.module.css';
import sheet from '@/app/admin/receipts/Receipt.module.css';

export async function generateMetadata({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  return { title: `Receipt ${decodeURIComponent(number)}` };
}

/**
 * The client's own receipt — the same document staff see.
 *
 * There is deliberately no separate client-facing version: two renderings of
 * one receipt is two things that can disagree, and this is the piece of paper
 * that proves they paid us.
 */
export default async function PortalReceipt({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const actor = await requireClient();
  const { number } = await params;
  const org = await getOrg();

  const receipt = await db.receipt.findFirst({
    where: {
      number: decodeURIComponent(number),
      // Scoped in the query: another client's receipt simply does not match.
      payment: { invoice: { clientId: actor.clientId } },
    },
    select: {
      number: true,
      issuedAt: true,
      payment: {
        select: {
          amountMinor: true,
          currency: true,
          method: true,
          reference: true,
          receivedAt: true,
          invoice: {
            select: {
              number: true,
              totalMinor: true,
              paidMinor: true,
              currency: true,
              client: { select: { name: true, legalName: true, country: true } },
              project: { select: { name: true } },
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
        <Link href="/portal/invoices" className={styles.projectMeta}>
          ← Invoices
        </Link>
        <PrintButton />
      </div>

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
                invoice.project.name
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
              <td className={sheet.detailValue}>
                <Link href={`/portal/invoices/${invoice.number}`}>{invoice.number}</Link>
              </td>
            </tr>
            <tr>
              <th className={sheet.detailKey} scope="row">
                {stillOwed === 0 ? 'Balance' : 'Balance remaining'}
              </th>
              <td className={sheet.detailValue}>
                {stillOwed === 0 ? 'Paid in full' : formatMoney(stillOwed, invoice.currency)}
              </td>
            </tr>
          </tbody>
        </table>

        <p className={sheet.foot}>
          This receipt confirms a payment recorded against invoice {invoice.number}. It is issued
          by {org.legalName} and is valid without a signature.
        </p>
      </article>
    </main>
  );
}
