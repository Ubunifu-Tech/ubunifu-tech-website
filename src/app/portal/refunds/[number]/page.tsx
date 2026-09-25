import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requireClient } from '@/lib/console/auth';
import { liveInvoice } from '@/lib/console/live';
import { getOrg } from '@/lib/console/org';
import { PrintButton } from '@/app/admin/receipts/PrintButton';
import { RefundNote } from '@/app/admin/refunds/RefundNote';
import styles from '../../Portal.module.css';
import sheet from '@/app/admin/receipts/Receipt.module.css';

export async function generateMetadata({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  return { title: `Refund ${decodeURIComponent(number)}` };
}

/** The client's own refund note: the same document staff see. */
export default async function PortalRefund({ params }: { params: Promise<{ number: string }> }) {
  const actor = await requireClient();
  const { number } = await params;
  const org = await getOrg();

  const refund = await db.refund.findFirst({
    where: {
      number: decodeURIComponent(number),
      // Scoped in the query: another client's refund simply does not match.
      payment: { invoice: { clientId: actor.clientId, ...liveInvoice } },
    },
    select: {
      number: true,
      amountMinor: true,
      currency: true,
      method: true,
      reference: true,
      refundedAt: true,
      reason: true,
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
        <Link href="/portal/invoices" className={styles.projectMeta}>
          ← Invoices
        </Link>
        <PrintButton />
      </div>
      <RefundNote refund={refund} org={org} />
    </main>
  );
}
