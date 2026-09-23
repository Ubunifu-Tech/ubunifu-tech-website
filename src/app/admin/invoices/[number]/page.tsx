import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/console/auth';
import { liveInvoice } from '@/lib/console/live';
import { activityFor } from '@/lib/console/activity';
import { INVOICE_STATUS_LABEL, PAYMENT_METHODS } from '@/lib/console/billing-labels';
import {
  formatMoney,
  formatShortDate,
  moneyInput,
  toDateInputValue,
} from '@/lib/console/money';
import { ActivityFeed } from '@/components/console/ActivityFeed';
import {
  EmailReceiptButton,
  RecordPaymentForm,
  SendInvoiceButton,
  VoidInvoiceForm,
} from '../InvoiceControls';
import { Figures } from '@/components/console/Figures';
import styles from '../../Admin.module.css';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';

const STATUS_BADGE: Record<string, string> = {
  draft: '',
  sent: forms.badgeLive,
  part_paid: forms.badgeWarn,
  paid: forms.badgeGood,
  overdue: forms.badgeBad,
  void: '',
};

export async function generateMetadata({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  return { title: decodeURIComponent(number) };
}


export default async function InvoicePage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  await requirePermission('invoices');
  const { number } = await params;
  const now = new Date();

  const invoice = await db.invoice.findUnique({
    where: { number: decodeURIComponent(number), ...liveInvoice },
    select: {
      id: true,
      number: true,
      status: true,
      currency: true,
      subtotalMinor: true,
      taxMinor: true,
      totalMinor: true,
      paidMinor: true,
      notes: true,
      issuedAt: true,
      dueAt: true,
      paidAt: true,
      voidedAt: true,
      client: { select: { name: true, slug: true, legalName: true } },
      project: { select: { name: true, slug: true, reference: true } },
      lines: {
        orderBy: { position: 'asc' },
        select: {
          id: true,
          label: true,
          description: true,
          amountMinor: true,
          quantity: true,
        },
      },
      payments: {
        orderBy: { receivedAt: 'desc' },
        select: {
          id: true,
          amountMinor: true,
          currency: true,
          method: true,
          reference: true,
          receivedAt: true,
          note: true,
          recordedBy: { select: { name: true } },
          receipt: { select: { id: true, number: true, issuedAt: true } },
        },
      },
    },
  });

  if (!invoice) notFound();

  const activity = await activityFor([invoice.id]);
  const outstanding = Math.max(0, invoice.totalMinor - invoice.paidMinor);
  const pastDue =
    invoice.status !== 'draft' &&
    invoice.status !== 'void' &&
    invoice.dueAt !== null &&
    invoice.dueAt < new Date();
  const methodLabel = (value: string) =>
    PAYMENT_METHODS.find((method) => method.value === value)?.label ?? value;

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <Link href="/invoices" className={styles.backLink}>
            ← Invoices
          </Link>
          <h1 className={styles.heading}>{invoice.number}</h1>
          <p className={styles.facts}>
            <span>
              <span className={styles.factLabel}>For</span>{' '}
              <Link href={`/clients/${invoice.client.slug}`}>
                {invoice.client.legalName ?? invoice.client.name}
              </Link>
            </span>
            {invoice.project && (
              <span>
                <span className={styles.factLabel}>Project</span>{' '}
                <Link href={`/projects/${invoice.project.slug}`}>
                  {invoice.project.reference}
                </Link>
              </span>
            )}
            <span>
              <span className={styles.factLabel}>Issued</span>{' '}
              {invoice.issuedAt ? formatShortDate(invoice.issuedAt) : 'not yet'}
            </span>
            <span>
              <span className={styles.factLabel}>Due</span> {formatShortDate(invoice.dueAt)}
            </span>
          </p>
        </div>
<div className={styles.headActions}>
          {invoice.status !== 'void' && (
            <Link href={`/invoices/${invoice.number}/print`} className={`${forms.button} ${forms.quiet}`}>
              Print or save as PDF
            </Link>
          )}
                  <span className={`${forms.badge} ${STATUS_BADGE[invoice.status]}`}>
          {INVOICE_STATUS_LABEL[invoice.status]}
        </span>
        </div>
      </div>

      <Figures
        label="This invoice at a glance"
        items={[
          {
            label: 'Total',
            value: formatMoney(invoice.totalMinor, invoice.currency),
            note: `${invoice.lines.length} ${invoice.lines.length === 1 ? 'line' : 'lines'}`,
          },
          {
            label: 'Received',
            value: formatMoney(invoice.paidMinor, invoice.currency),
            note: `${invoice.payments.length} ${invoice.payments.length === 1 ? 'payment' : 'payments'} recorded`,
          },
          {
            label: 'Outstanding',
            value: formatMoney(outstanding, invoice.currency),
            note:
              outstanding === 0
                ? 'Settled in full'
                : pastDue
                  ? `Past due since ${formatShortDate(invoice.dueAt)}`
                  : 'Still to come in',
            tone: outstanding > 0 && pastDue ? 'bad' : undefined,
          },
        ]}
      />

      <div className={styles.stack}>
        <div className={table.frame}>
          <div className={table.toolbar}>
            <div className={table.toolbarText}>
              <h2 className={table.title}>What this covers</h2>
              <span className={table.count}>
                As raised
              </span>
            </div>
          </div>
          <div className={table.scroll}>
            <table className={`${table.table} ${table.compact}`}>
              <thead>
                <tr>
                  <th className={table.th} scope="col">Item</th>
                  <th className={`${table.th} ${table.numericHead}`} scope="col">Qty</th>
                  <th className={`${table.th} ${table.numericHead}`} scope="col">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lines.map((line) => (
                  <tr key={line.id} className={table.tr}>
                    <td className={`${table.td} ${table.primary}`}>
                      {line.label}
                      {line.description && <span className={table.sub}>{line.description}</span>}
                    </td>
                    <td className={`${table.td} ${table.numeric}`}>{line.quantity}</td>
                    <td className={`${table.td} ${table.numeric}`}>
                      {formatMoney(line.amountMinor * line.quantity, invoice.currency)}
                    </td>
                  </tr>
                ))}
                <tr className={table.totalRow}>
                  <td className={table.td} colSpan={2}>
                    Total
                  </td>
                  <td className={`${table.td} ${table.numeric}`}>
                    {formatMoney(invoice.totalMinor, invoice.currency)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className={table.frame}>
          <div className={table.toolbar}>
            <div className={table.toolbarText}>
              <h2 className={table.title}>Payments and receipts</h2>
              <span className={table.count}>
                Every recorded payment issues a numbered receipt
              </span>
            </div>
          </div>
          <div className={table.scroll}>
            <table className={`${table.table} ${table.compact}`}>
              <thead>
                <tr>
                  <th className={table.th} scope="col">Receipt</th>
                  <th className={table.th} scope="col">Received</th>
                  <th className={table.th} scope="col">How</th>
                  <th className={table.th} scope="col">Reference</th>
                  <th className={table.th} scope="col">Recorded by</th>
                  <th className={`${table.th} ${table.numericHead}`} scope="col">Amount</th>
                  <th className={`${table.th} ${table.actionsHead}`} scope="col">
                    <span className={table.muted}>Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoice.payments.length === 0 ? (
                  <tr>
                    <td className={table.emptyCell} colSpan={7}>
                      <p className={table.emptyTitle}>Nothing received yet.</p>
                      <p className={table.emptyHint}>
                        No payments recorded yet.
                      </p>
                    </td>
                  </tr>
                ) : (
                  invoice.payments.map((payment) => (
                    <tr key={payment.id} className={table.tr}>
                      <td className={`${table.td} ${table.primary} ${table.nowrap}`}>
                        {payment.receipt ? (
                          <Link
                            href={`/receipts/${payment.receipt.number}`}
                            className={table.link}
                          >
                            {payment.receipt.number}
                          </Link>
                        ) : (
                          <span className={table.muted}>None</span>
                        )}
                      </td>
                      <td className={`${table.td} ${table.nowrap}`}>
                        {formatShortDate(payment.receivedAt)}
                      </td>
                      <td className={`${table.td} ${table.nowrap}`}>
                        {methodLabel(payment.method)}
                      </td>
                      <td className={table.td}>
                        {payment.reference ?? <span className={table.muted}>None</span>}
                      </td>
                      <td className={`${table.td} ${table.nowrap}`}>
                        {payment.recordedBy?.name ?? <span className={table.muted}>Unknown</span>}
                      </td>
                      <td className={`${table.td} ${table.numeric}`}>
                        {formatMoney(payment.amountMinor, payment.currency)}
                      </td>
                      <td className={`${table.td} ${table.actions}`}>
                        {payment.receipt && (
                          <span className={table.actionGroup}>
                            <Link
                              href={`/receipts/${payment.receipt.number}`}
                              className={table.action}
                            >
                              View
                            </Link>
                            <EmailReceiptButton receiptId={payment.receipt.id} />
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.columns}>
          <div className={styles.stack}>
            {invoice.status !== 'void' && (
              <section className={forms.card}>
                <div className={forms.cardHeader}>
                  <h2 className={forms.cardTitle}>
                    {outstanding === 0 ? 'Settled' : 'Record a payment'}
                  </h2>
                  <span className={forms.cardMeta}>
                    {outstanding === 0
                      ? `Paid in full${invoice.paidAt ? ` on ${formatShortDate(invoice.paidAt)}` : ''}`
                      : `${formatMoney(outstanding, invoice.currency)} outstanding`}
                  </span>
                </div>

                {invoice.status === 'draft' ? (
                  <>
                    <p className={styles.note}>
                      Send the invoice before recording a payment against it.
                    </p>
                    <div className={forms.actions}>
                      <SendInvoiceButton invoiceId={invoice.id} sent={false} />
                    </div>
                  </>
                ) : outstanding === 0 ? (
                  <div className={forms.actions}>
                    <SendInvoiceButton invoiceId={invoice.id} sent />
                    <p className={forms.payoff}>
                      Paid in full. Resend only if they ask for a copy.
                    </p>
                  </div>
                ) : (
                  <RecordPaymentForm
                    invoiceId={invoice.id}
                    outstanding={moneyInput(outstanding, invoice.currency)}
                    currency={invoice.currency}
                    today={toDateInputValue(now)}
                  />
                )}
              </section>
            )}

            <section className={forms.card}>
              <div className={forms.cardHeader}>
                <h2 className={forms.cardTitle}>The invoice itself</h2>
              </div>
              {invoice.notes && <p className={styles.quote}>{invoice.notes}</p>}
              <div className={forms.actions}>
                {invoice.status !== 'draft' && invoice.status !== 'void' && (
                  <SendInvoiceButton invoiceId={invoice.id} sent />
                )}
                {invoice.status !== 'void' && invoice.paidMinor === 0 && (
                  <VoidInvoiceForm invoiceId={invoice.id} />
                )}
                {invoice.status === 'void' && (
                  <p className={styles.note}>
                    Voided{invoice.voidedAt ? ` on ${formatShortDate(invoice.voidedAt)}` : ''}. It
                    keeps its number so the sequence stays unbroken.
                  </p>
                )}
              </div>
            </section>
          </div>

          <section className={forms.card}>
            <div className={forms.cardHeader}>
              <h2 className={forms.cardTitle}>What has happened</h2>
              <span className={forms.cardMeta}>Including every email we tried to send</span>
            </div>
            <ActivityFeed items={activity} now={now} />
          </section>
        </div>
      </div>
    </main>
  );
}
