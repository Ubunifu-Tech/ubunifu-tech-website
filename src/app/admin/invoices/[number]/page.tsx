import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/console/auth';
import { Callout } from '@/components/console/Callout';
import { activityFor } from '@/lib/console/activity';
import { INVOICE_STATUS_LABEL, invoiceStanding, PAYMENT_METHODS } from '@/lib/console/billing-labels';
import { formatMoney, formatShortDate, moneyInput, toDateInputValue, todayInput } from '@/lib/console/money';
import { ActivityFeed } from '@/components/console/ActivityFeed';
import {
  DraftInvoiceDetails,
  PaymentMenu,
  RecordPaymentForm,
  RefundMenu,
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

export default async function InvoicePage({ params }: { params: Promise<{ number: string }> }) {
  const staff = await requirePermission('invoices');
  const { number } = await params;
  const now = new Date();

  const invoice = await db.invoice.findUnique({
    // Removed clients' invoices too: staff with billing can always read the
    // record, and every action on this page refuses a removed one anyway.
    where: { number: decodeURIComponent(number) },
    select: {
      id: true,
      number: true,
      status: true,
      currency: true,
      subtotalMinor: true,
      taxMinor: true,
      totalMinor: true,
      paidMinor: true,
      refundedMinor: true,
      notes: true,
      issuedAt: true,
      dueAt: true,
      paidAt: true,
      voidedAt: true,
      client: { select: { name: true, slug: true, legalName: true, deletedAt: true } },
      project: { select: { name: true, slug: true, reference: true, deletedAt: true } },
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
          reversedAt: true,
          reversalReason: true,
          reversedBy: { select: { name: true } },
          refunds: {
            orderBy: { refundedAt: 'asc' },
            select: {
              id: true,
              number: true,
              amountMinor: true,
              currency: true,
              method: true,
              reference: true,
              refundedAt: true,
              reason: true,
              cancelledAt: true,
              cancelReason: true,
              recordedBy: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!invoice) notFound();

  const [activity, emailed] = await Promise.all([
    activityFor(staff, [invoice.id]),
    // An invoice issued with a payment already taken was never emailed, so its
    // button says Send, not Send again.
    db.emailLog.count({
      where: { entityId: invoice.id, template: 'invoice_sent', status: 'sent' },
    }),
  ]);
  const outstanding = Math.max(0, invoice.totalMinor - invoice.paidMinor);
  // Kept for the record, and read only, while its client or project is removed.
  const removedAt = invoice.client.deletedAt ?? invoice.project?.deletedAt ?? null;
  const pastDue =
    invoice.status !== 'draft' &&
    invoice.status !== 'void' &&
    invoice.dueAt !== null &&
    invoice.dueAt < new Date();
  const methodLabel = (value: string) =>
    PAYMENT_METHODS.find((method) => method.value === value)?.label ?? value;
  const refunds = invoice.payments
    .flatMap((payment) =>
      payment.refunds.map((refund) => ({
        ...refund,
        receiptNumber: payment.receipt?.number ?? null,
      })),
    )
    .sort((a, b) => a.refundedAt.getTime() - b.refundedAt.getTime());

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
              <Link
                href={
                  invoice.client.deletedAt
                    ? `/removed/${invoice.client.slug}`
                    : `/clients/${invoice.client.slug}`
                }
              >
                {invoice.client.legalName ?? invoice.client.name}
              </Link>
            </span>
            {invoice.project && (
              <span>
                <span className={styles.factLabel}>Project</span>{' '}
                {invoice.project.deletedAt ? (
                  invoice.project.reference
                ) : (
                  <Link href={`/projects/${invoice.project.slug}`}>{invoice.project.reference}</Link>
                )}
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
            <Link
              href={`/invoices/${invoice.number}/print`}
              className={`${forms.button} ${forms.quiet}`}
            >
              Print or save as PDF
            </Link>
          )}
          <span className={`${forms.badge} ${STATUS_BADGE[invoiceStanding(invoice, now)]}`}>
            {INVOICE_STATUS_LABEL[invoiceStanding(invoice, now)]}
          </span>
        </div>
      </div>

      {removedAt && (
        <Callout kind="info">
          {invoice.client.deletedAt ? invoice.client.name : 'Its project'} was removed on{' '}
          {formatShortDate(removedAt)}. This invoice is kept for the record. To work on it, bring{' '}
          {invoice.client.deletedAt ? 'the client' : 'the project'} back first.
        </Callout>
      )}

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
            note: (() => {
              const counted = invoice.payments.filter((p) => !p.reversedAt).length;
              const reversed = invoice.payments.length - counted;
              return `${counted} ${counted === 1 ? 'payment' : 'payments'} recorded${
                reversed > 0 ? `, ${reversed} reversed` : ''
              }${
                invoice.refundedMinor > 0
                  ? `, ${formatMoney(invoice.refundedMinor, invoice.currency)} refunded`
                  : ''
              }`;
            })(),
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
              <span className={table.count}>As raised</span>
            </div>
          </div>
          <div className={table.scroll}>
            <table className={`${table.table} ${table.compact}`}>
              <thead>
                <tr>
                  <th className={table.th} scope="col">
                    Item
                  </th>
                  <th className={`${table.th} ${table.numericHead}`} scope="col">
                    Qty
                  </th>
                  <th className={`${table.th} ${table.numericHead}`} scope="col">
                    Amount
                  </th>
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
              <span className={table.count}>Every recorded payment issues a numbered receipt</span>
            </div>
          </div>
          <div className={table.scroll}>
            <table className={`${table.table} ${table.compact}`}>
              <thead>
                <tr>
                  <th className={table.th} scope="col">
                    Receipt
                  </th>
                  <th className={table.th} scope="col">
                    State
                  </th>
                  <th className={table.th} scope="col">
                    Received
                  </th>
                  <th className={table.th} scope="col">
                    How
                  </th>
                  <th className={table.th} scope="col">
                    Reference
                  </th>
                  <th className={table.th} scope="col">
                    Recorded by
                  </th>
                  <th className={`${table.th} ${table.numericHead}`} scope="col">
                    Amount
                  </th>
                  <th className={`${table.th} ${table.actionsHead}`} scope="col">
                    <span className={table.muted}>Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoice.payments.length === 0 ? (
                  <tr>
                    <td className={table.emptyCell} colSpan={8}>
                      <p className={table.emptyTitle}>Nothing received yet.</p>
                      <p className={table.emptyHint}>No payments recorded yet.</p>
                    </td>
                  </tr>
                ) : (
                  invoice.payments.map((payment) => (
                    <tr key={payment.id} className={table.tr}>
                      <td className={`${table.td} ${table.primary} ${table.nowrap}`}>
                        {payment.receipt ? (
                          <Link href={`/receipts/${payment.receipt.number}`} className={table.link}>
                            {payment.receipt.number}
                          </Link>
                        ) : (
                          <span className={table.muted}>None</span>
                        )}
                      </td>
                      <td className={table.td}>
                        {payment.reversedAt ? (
                          <span
                            className={`${forms.badge} ${forms.badgeBad}`}
                            title={`Reversed ${formatShortDate(payment.reversedAt)}${
                              payment.reversedBy ? ` by ${payment.reversedBy.name}` : ''
                            }: ${payment.reversalReason ?? ''}`}
                          >
                            Reversed
                          </span>
                        ) : (
                          'Counted'
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
                        {payment.reversedAt ? (
                          <s>{formatMoney(payment.amountMinor, payment.currency)}</s>
                        ) : (
                          formatMoney(payment.amountMinor, payment.currency)
                        )}
                      </td>
                      <td className={`${table.td} ${table.actions}`}>
                        {removedAt ? (
                          payment.receipt && (
                            <Link href={`/receipts/${payment.receipt.number}`} className={table.action}>
                              Receipt
                            </Link>
                          )
                        ) : (
                        <PaymentMenu
                          paymentId={payment.id}
                          receipt={payment.receipt}
                          reversed={payment.reversedAt !== null}
                          refunded={payment.refunds.some((refund) => !refund.cancelledAt)}
                          refundable={
                            payment.amountMinor -
                            payment.refunds
                              .filter((refund) => !refund.cancelledAt)
                              .reduce((total, refund) => total + refund.amountMinor, 0)
                          }
                          currency={payment.currency}
                          today={todayInput()}
                        />
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {refunds.length > 0 && (
          <div className={table.frame}>
            <div className={table.toolbar}>
              <div className={table.toolbarText}>
                <h2 className={table.title}>Refunds</h2>
                <span className={table.count}>
                  {formatMoney(invoice.refundedMinor, invoice.currency)} sent back
                </span>
              </div>
            </div>
            <div className={table.scroll}>
              <table className={`${table.table} ${table.compact}`}>
                <thead>
                  <tr>
                    <th className={table.th} scope="col">
                      Refund note
                    </th>
                    <th className={table.th} scope="col">
                      From receipt
                    </th>
                    <th className={table.th} scope="col">
                      Reason
                    </th>
                    <th className={table.th} scope="col">
                      Sent back
                    </th>
                    <th className={table.th} scope="col">
                      How
                    </th>
                    <th className={table.th} scope="col">
                      Reference
                    </th>
                    <th className={table.th} scope="col">
                      Recorded by
                    </th>
                    <th className={`${table.th} ${table.numericHead}`} scope="col">
                      Amount
                    </th>
                    <th className={`${table.th} ${table.actionsHead}`} scope="col">
                      <span className={table.muted}>Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {refunds.map((refund) => (
                    <tr key={refund.id} className={table.tr}>
                      <td className={`${table.td} ${table.primary} ${table.nowrap}`}>
                        <Link href={`/refunds/${refund.number}`} className={table.link}>
                          {refund.number}
                        </Link>
                      </td>
                      <td className={`${table.td} ${table.nowrap}`}>
                        {refund.receiptNumber ?? <span className={table.muted}>None</span>}
                      </td>
                      <td className={table.td}>
                        {refund.cancelledAt && (
                          <span className={`${forms.badge} ${forms.badgeBad}`}>Cancelled</span>
                        )}{' '}
                        <span className={table.clamp}>
                          {refund.cancelledAt
                            ? `Cancelled ${formatShortDate(refund.cancelledAt)}: ${refund.cancelReason ?? 'no reason given'}`
                            : refund.reason}
                        </span>
                      </td>
                      <td className={`${table.td} ${table.nowrap}`}>
                        {formatShortDate(refund.refundedAt)}
                      </td>
                      <td className={`${table.td} ${table.nowrap}`}>
                        {methodLabel(refund.method)}
                      </td>
                      <td className={table.td}>
                        {refund.reference ?? <span className={table.muted}>None</span>}
                      </td>
                      <td className={`${table.td} ${table.nowrap}`}>
                        {refund.recordedBy?.name ?? <span className={table.muted}>Unknown</span>}
                      </td>
                      <td className={`${table.td} ${table.numeric}`}>
                        {formatMoney(refund.amountMinor, refund.currency)}
                      </td>
                      <td className={`${table.td} ${table.actions}`}>
                        {removedAt ? (
                          <Link href={`/refunds/${refund.number}`} className={table.action}>
                            Refund note
                          </Link>
                        ) : (
                          <RefundMenu
                            refundId={refund.id}
                            number={refund.number}
                            cancelled={refund.cancelledAt !== null}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className={styles.columns}>
          <div className={styles.stack}>
            {!removedAt && invoice.status !== 'void' && (
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

                {invoice.status === 'draft' && (
                  <div className={forms.actions}>
                    <SendInvoiceButton invoiceId={invoice.id} sent={false} />
                    <p className={forms.payoff}>Or, if they have paid already, record it here.</p>
                  </div>
                )}
                {/* One place in the tree for the form, draft or not, so the
                    message it shows after issuing a draft survives the refresh. */}
                {outstanding > 0 ? (
                  <RecordPaymentForm
                    invoiceId={invoice.id}
                    outstanding={moneyInput(outstanding, invoice.currency)}
                    currency={invoice.currency}
                    today={todayInput()}
                  />
                ) : (
                  <p className={styles.note}>
                    Nothing is owed. The receipts are listed above, ready to email or print.
                  </p>
                )}
              </section>
            )}

            <section className={forms.card}>
              <div className={forms.cardHeader}>
                <h2 className={forms.cardTitle}>The invoice itself</h2>
              </div>
              {invoice.notes && <p className={styles.quote}>{invoice.notes}</p>}
              <div className={forms.actions}>
                {!removedAt && invoice.status === 'draft' && (
                  <DraftInvoiceDetails
                    invoiceId={invoice.id}
                    dueAt={invoice.dueAt ? toDateInputValue(invoice.dueAt) : ''}
                    notes={invoice.notes ?? ''}
                  />
                )}
                {!removedAt && invoice.status !== 'draft' && invoice.status !== 'void' && (
                  <SendInvoiceButton
                    invoiceId={invoice.id}
                    sent={emailed > 0}
                    label={outstanding === 0 ? 'Email a copy' : undefined}
                  />
                )}
                {!removedAt &&
                  invoice.status !== 'void' &&
                  invoice.paidMinor - invoice.refundedMinor === 0 && (
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
