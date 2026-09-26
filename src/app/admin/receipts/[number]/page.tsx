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
export default async function ReceiptPage({ params }: { params: Promise<{ number: string }> }) {
  await requirePermission('invoices');
  const { number } = await params;
  const org = await getOrg();

  const receipt = await db.receipt.findUnique({
    // A removed client's receipts stay readable: they are the record.
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
  });

  if (!receipt) notFound();

  const { payment } = receipt;
  const { invoice } = payment;

  return (
    <main className={styles.page}>
      <div className={sheet.toolbar}>
        <Link href={`/invoices/${invoice.number}`} className={styles.backLink}>
          ← {invoice.number}
        </Link>
        <PrintButton />
        {!payment.reversedAt && !invoice.client.deletedAt && !invoice.project?.deletedAt && (
          <EmailReceiptButton receiptId={receipt.id} />
        )}
      </div>

      <ReceiptSheet receipt={receipt} org={org} invoiceHref={`/invoices/${invoice.number}`} />
    </main>
  );
}
