import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { InvoiceSheet } from '@/components/documents/InvoiceSheet';
import { INVOICE_SHEET_SELECT, toSheet } from '@/lib/console/invoice-sheet';
import { requireClient } from '@/lib/console/auth';
import { liveInvoice, sentToClient } from '@/lib/console/live';
import { portalInvoiceState } from '@/lib/console/billing-labels';
import { formatDate } from '@/lib/console/money';
import { ReachUs } from '@/components/console/ReachUs';
import { getOrg } from '@/lib/console/org';
import { PrintButton } from '@/app/admin/receipts/PrintButton';
import styles from '../../Portal.module.css';
import forms from '@/styles/forms.module.css';
import sheet from '@/app/admin/receipts/Receipt.module.css';

const TONE_CLASS: Record<string, string> = {
  neutral: '',
  good: forms.badgeGood,
  bad: forms.badgeBad,
  warn: forms.badgeWarn,
};

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
    select: { ...INVOICE_SHEET_SELECT, projectId: true },
  });

  if (!invoice) notFound();
  const state = portalInvoiceState(invoice, new Date());
  const project = invoice.projectId
    ? await db.project.findFirst({
        where: { id: invoice.projectId, clientId: actor.clientId, deletedAt: null },
        select: { id: true },
      })
    : null;
  // Straight to a request with the invoice already named in it.
  const tellUs = `/portal/requests?${new URLSearchParams({
    kind: 'question',
    subject: `Paid ${invoice.number}`,
    ...(project ? { project: project.id } : {}),
  })}#new-request`;

  return (
    <main className={styles.page}>
      <div className={sheet.toolbar}>
        <Link href="/portal/invoices" className={styles.backLink}>
          ← Invoices
        </Link>
        <PrintButton />
        <span className={`${forms.badge} ${TONE_CLASS[state.tone]}`}>
          {state.owing && state.label !== 'Overdue' && invoice.dueAt
            ? `Due ${formatDate(invoice.dueAt)}`
            : state.label}
        </span>
      </div>
      <InvoiceSheet
        invoice={toSheet(invoice)}
        org={org}
        receiptHref={(receipt) => `/portal/receipts/${receipt}`}
      />
      {state.owing && (
        <section className={`${forms.card} ${sheet.noPrint}`}>
          <div className={forms.cardHeader}>
            <h2 className={forms.cardTitle}>Paid already?</h2>
          </div>
          <p className={styles.note}>
            Tell us when and how you paid, and we will send your receipt.
          </p>
          <div className={forms.actions}>
            <Link href={tellUs} className={`${forms.button} ${forms.quiet}`}>
              Tell us you have paid
            </Link>
          </div>
          {!org.bankAccountNumber && !org.mobileMoneyNumber && (
            <ReachUs
              lead="Not sure how to pay?"
              message={`Hello, how do I pay ${invoice.number}?`}
              className={styles.note}
            />
          )}
        </section>
      )}
    </main>
  );
}
