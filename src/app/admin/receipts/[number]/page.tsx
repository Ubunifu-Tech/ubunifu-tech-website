import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/console/auth';
import { getOrg } from '@/lib/console/org';
import { ReceiptSheet } from '@/components/documents/ReceiptSheet';
import { EmailReceiptButton } from '../../invoices/InvoiceControls';
import { PrintButton } from '../PrintButton';
import styles from '../../Admin.module.css';
import sheet from '../Receipt.module.css';
import { formatShortDate, numbers } from '@/lib/console/money';

export async function generateMetadata({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  // Absolute, so a printed or saved copy is named for the document and
  // never carries the console or portal name.
  return { title: { absolute: `Receipt ${number} · Ubunifu Technologies` } };
}

/**
 * The receipt.
 *
 * Deliberately the same document staff see and the client receives — there is
 * no second, prettier version for sending. What is on screen is what prints,
 * which is the only way the two can never disagree.
 */
export default async function ReceiptPage({ params }: { params: Promise<{ number: string }> }) {
  await requirePermission('invoices');
  const { number } = await params;
  const org = await getOrg();

  const receipt = numbers(await db.receipt.findUnique({
    // A removed client's receipts stay readable: they are the record.
    where: { number: number },
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
          reversedAt: true,
          reversalReason: true,
          // A cancelled refund sent nothing back, so the receipt does not show it.
          refunds: {
            where: { cancelledAt: null },
            orderBy: { refundedAt: 'asc' },
            select: { number: true, amountMinor: true, currency: true, refundedAt: true },
          },
          note: true,
          recordedBy: { select: { name: true } },
          invoice: {
            select: {
              number: true,
              status: true,
              voidedAt: true,
              totalMinor: true,
              paidMinor: true,
              currency: true,
              client: {
                select: { name: true, legalName: true, slug: true, country: true, deletedAt: true },
              },
              project: { select: { name: true, reference: true, slug: true, deletedAt: true } },
            },
          },
        },
      },
    },
  }));

  if (!receipt) notFound();

  const { payment } = receipt;
  const { invoice } = payment;

  const lastEmail = await db.emailLog.findFirst({
    where: { entityType: 'Receipt', entityId: receipt.id, template: 'receipt_sent' },
    orderBy: { createdAt: 'desc' },
    select: { status: true, toAddress: true, sentAt: true, createdAt: true },
  });
  const emailed = !lastEmail
    ? 'Not emailed yet'
    : lastEmail.status === 'sent'
      ? `Emailed to ${lastEmail.toAddress}, ${formatShortDate(lastEmail.sentAt ?? lastEmail.createdAt)}`
      : lastEmail.status === 'failed'
        ? 'The email did not send'
        : 'Sending';

  return (
    <main className={styles.page}>
      <div className={sheet.toolbar}>
        <Link href={`/invoices/${invoice.number}`} className={styles.backLink}>
          ← {invoice.number}
        </Link>
        {!invoice.client.deletedAt && (
          <Link href={`/clients/${invoice.client.slug}`} className={sheet.toolbarLink}>
            {invoice.client.name}
          </Link>
        )}
        {invoice.project && !invoice.project.deletedAt && (
          <Link href={`/projects/${invoice.project.slug}`} className={sheet.toolbarLink}>
            {invoice.project.name}
          </Link>
        )}
        <div className={sheet.toolbarEnd}>
          {!payment.reversedAt && <span className={sheet.toolbarNote}>{emailed}</span>}
          {!payment.reversedAt && !invoice.client.deletedAt && !invoice.project?.deletedAt && (
            <EmailReceiptButton receiptId={receipt.id} />
          )}
          <PrintButton />
        </div>
      </div>

      <ReceiptSheet
        receipt={receipt}
        org={org}
        invoiceHref={`/invoices/${invoice.number}`}
        refundHref={(number) => `/refunds/${number}`}
      />
    </main>
  );
}
