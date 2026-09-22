import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { BrandMark } from '@/components/BrandMark';
import { requireClient } from '@/lib/console/auth';
import { INVOICE_STATUS_LABEL } from '@/lib/console/billing-labels';
import { getOrg } from '@/lib/console/org';
import { formatDate, formatMoney } from '@/lib/console/money';
import { PrintButton } from '@/app/admin/receipts/PrintButton';
import styles from '../../Portal.module.css';
import forms from '@/styles/forms.module.css';
import sheet from '@/app/admin/receipts/Receipt.module.css';

export async function generateMetadata({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  return { title: `Invoice ${decodeURIComponent(number)}` };
}

/**
 * The client's copy of an invoice.
 *
 * Scoped by clientId in the query itself, and drafts and voided invoices are
 * excluded there too — so a guessed number belonging to someone else, or to a
 * document we have not actually sent, simply does not match.
 */
export default async function PortalInvoice({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const actor = await requireClient();
  const { number } = await params;
  const org = await getOrg();

  const invoice = await db.invoice.findFirst({
    where: {
      number: decodeURIComponent(number),
      clientId: actor.clientId,
      status: { notIn: ['draft', 'void'] },
    },
    select: {
      number: true,
      status: true,
      currency: true,
      totalMinor: true,
      paidMinor: true,
      notes: true,
      issuedAt: true,
      dueAt: true,
      client: { select: { name: true, legalName: true, country: true } },
      project: { select: { name: true, reference: true } },
      lines: {
        orderBy: { position: 'asc' },
        select: { id: true, label: true, description: true, amountMinor: true, quantity: true },
      },
      payments: {
        orderBy: { receivedAt: 'desc' },
        select: {
          id: true,
          amountMinor: true,
          currency: true,
          receivedAt: true,
          receipt: { select: { number: true } },
        },
      },
    },
  });

  if (!invoice) notFound();

  const owed = Math.max(0, invoice.totalMinor - invoice.paidMinor);

  return (
    <main className={styles.page}>
      <div className={sheet.toolbar}>
        <Link href="/portal/invoices" className={styles.projectMeta}>
          ← Invoices
        </Link>
        <PrintButton />
        <span className={`${forms.badge} ${owed === 0 ? forms.badgeGood : forms.badgeWarn}`}>
          {INVOICE_STATUS_LABEL[invoice.status]}
        </span>
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
            <p className={sheet.docLabel}>Invoice</p>
            <p className={sheet.docNumber}>{invoice.number}</p>
          </div>
        </header>

        <div className={sheet.parties}>
          <div>
            <p className={sheet.partyLabel}>Billed to</p>
            <p className={sheet.partyValue}>
              {invoice.client.legalName ?? invoice.client.name}
              <br />
              {invoice.client.country}
            </p>
          </div>
          <div>
            <p className={sheet.partyLabel}>Issued</p>
            <p className={sheet.partyValue}>{formatDate(invoice.issuedAt)}</p>
          </div>
          <div>
            <p className={sheet.partyLabel}>Due</p>
            <p className={sheet.partyValue}>{formatDate(invoice.dueAt)}</p>
          </div>
          {invoice.project && (
            <div>
              <p className={sheet.partyLabel}>For</p>
              <p className={sheet.partyValue}>
                {invoice.project.name}
                <br />
                {invoice.project.reference}
              </p>
            </div>
          )}
        </div>

        <table className={sheet.detailTable}>
          <tbody>
            {invoice.lines.map((line) => (
              <tr key={line.id}>
                <th className={sheet.detailKey} scope="row">
                  {line.label}
                  {line.description && (
                    <span className={sheet.issuerLine}>{line.description}</span>
                  )}
                </th>
                <td className={sheet.detailValue}>
                  {formatMoney(line.amountMinor * line.quantity, invoice.currency)}
                </td>
              </tr>
            ))}
            <tr>
              <th className={sheet.detailKey} scope="row">Total</th>
              <td className={sheet.detailValue}>
                {formatMoney(invoice.totalMinor, invoice.currency)}
              </td>
            </tr>
            {invoice.paidMinor > 0 && (
              <tr>
                <th className={sheet.detailKey} scope="row">Received</th>
                <td className={sheet.detailValue}>
                  {formatMoney(invoice.paidMinor, invoice.currency)}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className={sheet.amountBlock}>
          <p className={sheet.amountLabel}>
            {owed === 0 ? 'Paid in full — thank you' : 'Amount due'}
          </p>
          <p className={sheet.amount}>{formatMoney(owed, invoice.currency)}</p>
        </div>

        {owed > 0 && (org.bankAccountNumber || org.mobileMoneyNumber) && (
          <table className={sheet.detailTable}>
            <tbody>
              {org.bankAccountNumber && (
                <>
                  <tr>
                    <th className={sheet.detailKey} scope="row">Bank</th>
                    <td className={sheet.detailValue}>{org.bankName ?? '—'}</td>
                  </tr>
                  <tr>
                    <th className={sheet.detailKey} scope="row">Account name</th>
                    <td className={sheet.detailValue}>{org.bankAccountName ?? org.legalName}</td>
                  </tr>
                  <tr>
                    <th className={sheet.detailKey} scope="row">Account number</th>
                    <td className={sheet.detailValue}>{org.bankAccountNumber}</td>
                  </tr>
                  {org.bankSwift && (
                    <tr>
                      <th className={sheet.detailKey} scope="row">SWIFT</th>
                      <td className={sheet.detailValue}>{org.bankSwift}</td>
                    </tr>
                  )}
                </>
              )}
              {org.mobileMoneyNumber && (
                <tr>
                  <th className={sheet.detailKey} scope="row">Mobile money</th>
                  <td className={sheet.detailValue}>
                    {org.mobileMoneyName ? `${org.mobileMoneyName} · ` : ''}
                    {org.mobileMoneyNumber}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {invoice.payments.length > 0 && (
          <table className={sheet.detailTable}>
            <tbody>
              {invoice.payments.map((payment) => (
                <tr key={payment.id}>
                  <th className={sheet.detailKey} scope="row">
                    Received {formatDate(payment.receivedAt)}
                    {payment.receipt && (
                      <span className={sheet.issuerLine}>
                        <Link href={`/portal/receipts/${payment.receipt.number}`}>
                          Receipt {payment.receipt.number}
                        </Link>
                      </span>
                    )}
                  </th>
                  <td className={sheet.detailValue}>
                    {formatMoney(payment.amountMinor, payment.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <p className={sheet.foot}>
          {invoice.notes ? `${invoice.notes} ` : ''}
          {org.invoiceFooter ??
            'Please quote the invoice number with your payment so we can match it straight away.'}
        </p>
      </article>
    </main>
  );
}
