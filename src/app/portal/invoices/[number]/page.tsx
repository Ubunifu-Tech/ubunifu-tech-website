import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { InvoiceSheet } from '@/components/documents/InvoiceSheet';
import { INVOICE_SHEET_SELECT, toSheet } from '@/lib/console/invoice-sheet';
import { requireClient } from '@/lib/console/auth';
import { liveInvoice, sentToClient } from '@/lib/console/live';
import { INVOICE_STATUS_LABEL, invoiceStanding } from '@/lib/console/billing-labels';
import { getOrg } from '@/lib/console/org';
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
 * Scoped by clientId in the query itself, and anything never sent is
 * excluded there too, so a guessed number belonging to someone else, or to a
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
      ...liveInvoice,
      ...sentToClient,
    },
    select: INVOICE_SHEET_SELECT,
  });

  if (!invoice) notFound();
  const owed = Math.max(0, invoice.totalMinor - invoice.paidMinor);
  const standing = invoiceStanding(invoice, new Date());

  return (
    <main className={styles.page}>
      <div className={sheet.toolbar}>
        <Link href="/portal/invoices" className={styles.backLink}>
          ← Invoices
        </Link>
        <PrintButton />
        {invoice.status === 'void' ? (
          <span className={forms.badge}>Cancelled</span>
        ) : (
          <span
            className={`${forms.badge} ${
              owed === 0 ? forms.badgeGood : standing === 'overdue' ? forms.badgeBad : forms.badgeWarn
            }`}
          >
            {INVOICE_STATUS_LABEL[standing]}
          </span>
        )}
      </div>
      <InvoiceSheet
        invoice={toSheet(invoice)}
        org={org}
        receiptHref={(receipt) => `/portal/receipts/${receipt}`}
      />
    </main>
  );
}
