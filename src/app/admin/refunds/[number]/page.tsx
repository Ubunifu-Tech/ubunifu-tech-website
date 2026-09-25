import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/console/auth';
import { livePayment } from '@/lib/console/live';
import { getOrg } from '@/lib/console/org';
import { EmailRefundButton } from '../../invoices/InvoiceControls';
import { PrintButton } from '../../receipts/PrintButton';
import { RefundNote } from '../RefundNote';
import styles from '../../Admin.module.css';
import sheet from '../../receipts/Receipt.module.css';

export async function generateMetadata({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  return { title: `Refund ${decodeURIComponent(number)}` };
}

/** A refund note, as the client receives it. */
export default async function RefundPage({ params }: { params: Promise<{ number: string }> }) {
  await requirePermission('invoices');
  const { number } = await params;
  const org = await getOrg();

  const refund = await db.refund.findFirst({
    where: { number: decodeURIComponent(number), payment: livePayment },
    select: {
      id: true,
      number: true,
      amountMinor: true,
      currency: true,
      method: true,
      reference: true,
      refundedAt: true,
      reason: true,
      recordedBy: { select: { name: true } },
      payment: {
        select: {
          amountMinor: true,
          receivedAt: true,
          receipt: { select: { number: true } },
          invoice: {
            select: {
              number: true,
              client: { select: { name: true, legalName: true, country: true } },
              project: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!refund) notFound();

  return (
    <main className={styles.page}>
      <div className={sheet.toolbar}>
        <Link href={`/invoices/${refund.payment.invoice.number}`} className={styles.backLink}>
          ← {refund.payment.invoice.number}
        </Link>
        <PrintButton />
        <EmailRefundButton refundId={refund.id} />
      </div>
      <RefundNote refund={refund} org={org} />
    </main>
  );
}
