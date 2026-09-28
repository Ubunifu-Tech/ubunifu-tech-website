import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/console/auth';
import { getOrg } from '@/lib/console/org';
import { InvoiceSheet } from '@/components/documents/InvoiceSheet';
import { INVOICE_SHEET_SELECT, toSheet } from '@/lib/console/invoice-sheet';
import { PrintButton } from '../../../receipts/PrintButton';
import styles from '../../../Admin.module.css';
import sheet from '../../../receipts/Receipt.module.css';

export async function generateMetadata({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  // Absolute, so a printed or saved copy is named for the document and
  // never carries the console or portal name.
  return { title: { absolute: `Invoice ${number} · Ubunifu Technologies` } };
}

/** The invoice exactly as the client gets it, ready to print or save. */
export default async function PrintInvoice({ params }: { params: Promise<{ number: string }> }) {
  await requirePermission('invoices');
  const { number } = await params;

  const [invoice, org] = await Promise.all([
    db.invoice.findUnique({
      // A removed client's invoice still prints: it is the record.
      where: { number: number },
      select: INVOICE_SHEET_SELECT,
    }),
    getOrg(),
  ]);
  // A void invoice prints as well: the sheet marks it cancelled.
  if (!invoice) notFound();

  return (
    <main className={styles.page}>
      <div className={sheet.toolbar}>
        <Link href={`/invoices/${invoice.number}`} className={styles.backLink}>
          ← {invoice.number}
        </Link>
        <PrintButton />
      </div>
      <InvoiceSheet invoice={toSheet(invoice)} org={org} />
    </main>
  );
}
