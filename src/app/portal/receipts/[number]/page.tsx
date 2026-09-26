import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requireClient } from '@/lib/console/auth';
import { liveInvoice } from '@/lib/console/live';
import { getOrg } from '@/lib/console/org';
import { ReceiptSheet } from '@/components/documents/ReceiptSheet';
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
export default async function PortalReceipt({ params }: { params: Promise<{ number: string }> }) {
  const actor = await requireClient();
  const { number } = await params;
  const org = await getOrg();

  const receipt = await db.receipt.findFirst({
    where: {
      number: decodeURIComponent(number),
      // Scoped in the query: another client's receipt simply does not match.
      payment: { invoice: { clientId: actor.clientId, ...liveInvoice } },
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
          reversedAt: true,
          reversalReason: true,
          refunds: {
            orderBy: { refundedAt: 'asc' },
            select: { number: true, amountMinor: true, currency: true, refundedAt: true },
          },
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

  return (
    <main className={styles.page}>
      <div className={sheet.toolbar}>
        <Link href="/portal/invoices" className={styles.projectMeta}>
          ← Invoices
        </Link>
        <PrintButton />
      </div>

      <ReceiptSheet receipt={receipt} org={org} invoiceHref={`/portal/invoices/${invoice.number}`} />
    </main>
  );
}
