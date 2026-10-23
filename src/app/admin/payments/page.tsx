import Link from 'next/link';
import { db } from '@/lib/db';
import type { Prisma } from '@/generated/prisma/client';
import { requirePermission } from '@/lib/console/auth';
import { PAYMENT_METHODS } from '@/lib/console/billing-labels';
import { formatMoney, formatShortDate, numbers } from '@/lib/console/money';
import { liveInvoice } from '@/lib/console/live';
import { ListFooter, ListToolbar, searchText } from '@/components/console/ListToolbar';
import { pageNumber, pageWindow } from '@/lib/console/paging';
import styles from '../Admin.module.css';
import { MoneyTabs } from '../MoneyTabs';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';

export const metadata = { title: 'Payments' };

const VIEWS = [
  { key: 'received', label: 'Received' },
  { key: 'refunds', label: 'Refunds' },
  { key: 'reversed', label: 'Reversed' },
] as const;

const METHOD = new Map<string, string>(PAYMENT_METHODS.map((method) => [method.value, method.label]));

/**
 * Every payment and the receipt it was given, and every refund, in one list.
 * A receipt is found here by its number, the M-Pesa or bank reference, the
 * invoice, the client or the project. Removed clients' money is left out, as
 * it is from every total; it stays readable on the removed client's page.
 */
export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string; q?: string; page?: string; client?: string; project?: string }>;
}) {
  const staff = await requirePermission('invoices');
  const { show, q, page, client: clientSlug, project: projectSlug } = await searchParams;
  const active = VIEWS.some((view) => view.key === show) ? show! : 'received';
  const query = searchText(q);

  const client = clientSlug
    ? await db.client.findFirst({ where: { slug: clientSlug, deletedAt: null }, select: { id: true, name: true, slug: true } })
    : null;
  const project = projectSlug
    ? await db.project.findFirst({ where: { slug: projectSlug, deletedAt: null }, select: { id: true, name: true, slug: true } })
    : null;
  const onInvoice: Prisma.InvoiceWhereInput = {
    AND: [liveInvoice, client ? { clientId: client.id } : {}, project ? { projectId: project.id } : {}],
  };

  const paymentSearch: Prisma.PaymentWhereInput = query
    ? {
        OR: [
          { reference: { contains: query, mode: 'insensitive' } },
          { receipt: { number: { contains: query, mode: 'insensitive' } } },
          { invoice: { number: { contains: query, mode: 'insensitive' } } },
          { invoice: { client: { name: { contains: query, mode: 'insensitive' } } } },
          { invoice: { client: { legalName: { contains: query, mode: 'insensitive' } } } },
          { invoice: { project: { name: { contains: query, mode: 'insensitive' } } } },
        ],
      }
    : {};
  const refundSearch: Prisma.RefundWhereInput = query
    ? {
        OR: [
          { number: { contains: query, mode: 'insensitive' } },
          { reference: { contains: query, mode: 'insensitive' } },
          { payment: { receipt: { number: { contains: query, mode: 'insensitive' } } } },
          { payment: { invoice: { number: { contains: query, mode: 'insensitive' } } } },
          { payment: { invoice: { client: { name: { contains: query, mode: 'insensitive' } } } } },
          { payment: { invoice: { project: { name: { contains: query, mode: 'insensitive' } } } } },
        ],
      }
    : {};

  const paymentWhere = (reversed: boolean): Prisma.PaymentWhereInput => ({
    AND: [{ invoice: onInvoice }, { reversedAt: reversed ? { not: null } : null }, paymentSearch],
  });
  const refundWhere: Prisma.RefundWhereInput = {
    AND: [{ payment: { invoice: onInvoice } }, { cancelledAt: null }, refundSearch],
  };

  const counts = await Promise.all([
    db.payment.count({ where: paymentWhere(false) }),
    db.refund.count({ where: refundWhere }),
    db.payment.count({ where: paymentWhere(true) }),
  ]);
  const total = counts[VIEWS.findIndex((view) => view.key === active)] ?? 0;
  const shown = pageWindow(pageNumber(page), total);

  const invoiceFacts = {
    select: {
      number: true,
      client: { select: { name: true, slug: true } },
      project: { select: { name: true, slug: true } },
    },
  } as const;

  const [payments, refunds] = await Promise.all([
    active === 'refunds'
      ? []
      : db.payment
          .findMany({
            where: paymentWhere(active === 'reversed'),
            orderBy: [{ receivedAt: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
            skip: shown.skip,
            take: shown.take,
            select: {
              id: true,
              amountMinor: true,
              currency: true,
              method: true,
              reference: true,
              receivedAt: true,
              reversedAt: true,
              receipt: { select: { number: true } },
              invoice: invoiceFacts,
            },
          })
          .then(numbers),
    active === 'refunds'
      ? db.refund
          .findMany({
            where: refundWhere,
            orderBy: [{ refundedAt: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
            skip: shown.skip,
            take: shown.take,
            select: {
              id: true,
              number: true,
              amountMinor: true,
              currency: true,
              method: true,
              reference: true,
              refundedAt: true,
              payment: { select: { receipt: { select: { number: true } }, invoice: invoiceFacts } },
            },
          })
          .then(numbers)
      : [],
  ]);

  const rows =
    active === 'refunds'
      ? refunds.map((refund) => ({
          id: refund.id,
          on: refund.refundedAt,
          number: refund.number,
          href: `/refunds/${refund.number}`,
          invoice: refund.payment.invoice,
          method: refund.method,
          reference: refund.reference,
          amount: formatMoney(refund.amountMinor, refund.currency),
        }))
      : payments.map((payment) => ({
          id: payment.id,
          on: payment.receivedAt,
          number: payment.receipt?.number ?? null,
          href: payment.receipt ? `/receipts/${payment.receipt.number}` : null,
          invoice: payment.invoice,
          method: payment.method,
          reference: payment.reference,
          amount: formatMoney(payment.amountMinor, payment.currency),
        }));

  const noun: [string, string] = active === 'refunds' ? ['refund', 'refunds'] : ['payment', 'payments'];

  return (
    <main className={styles.page}>
      <MoneyTabs staff={staff} current="payments" />
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <h1 className={styles.heading}>
            {project ? `Payments for ${project.name}` : client ? `Payments from ${client.name}` : 'Payments'}
          </h1>
        </div>
        <div className={styles.headActions}>
          <Link
            href={`/payments/new${project ? `?project=${project.slug}` : client ? `?client=${client.slug}` : ''}`}
            className={forms.button}
          >
            Record a payment
          </Link>
        </div>
      </div>

      <div className={table.frame}>
        <ListToolbar
          path="/payments"
          views={VIEWS.map((view, index) => ({ ...view, count: counts[index] ?? 0 }))}
          current={active}
          defaultView="received"
          query={query}
          searchLabel="Search by receipt, reference, invoice or client"
          keep={{ client: client?.slug, project: project?.slug }}
        />

        <div className={table.scroll}>
          <table className={table.table}>
            <thead>
              <tr>
                <th className={table.th} scope="col">
                  {active === 'refunds' ? 'Refunded' : 'Received'}
                </th>
                <th className={table.th} scope="col">
                  {active === 'refunds' ? 'Refund' : 'Receipt'}
                </th>
                <th className={table.th} scope="col">
                  Client
                </th>
                <th className={table.th} scope="col">
                  Project
                </th>
                <th className={table.th} scope="col">
                  Method
                </th>
                <th className={table.th} scope="col">
                  Reference
                </th>
                <th className={`${table.th} ${table.numericHead}`} scope="col">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className={table.emptyCell} colSpan={7}>
                    <p className={table.emptyTitle}>
                      {query ? `Nothing matches “${query}” here.` : `No ${noun[1]} yet.`}
                    </p>
                    {query && <p className={table.emptyHint}>Try another view, or search for something else.</p>}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className={table.tr}>
                    <td className={`${table.td} ${table.nowrap}`}>{formatShortDate(row.on)}</td>
                    <td className={`${table.td} ${table.nowrap}`}>
                      {row.href ? (
                        <Link href={row.href} className={table.link}>
                          {row.number}
                        </Link>
                      ) : (
                        <span className={table.muted}>None</span>
                      )}
                    </td>
                    <td className={`${table.td} ${table.name}`}>
                      <Link href={`/clients/${row.invoice.client.slug}`} className={table.link}>
                        {row.invoice.client.name}
                      </Link>
                    </td>
                    <td className={`${table.td} ${table.name}`}>
                      {row.invoice.project ? (
                        <Link href={`/projects/${row.invoice.project.slug}`} className={table.link}>
                          {row.invoice.project.name}
                        </Link>
                      ) : (
                        <span className={table.muted}>None</span>
                      )}
                    </td>
                    <td className={`${table.td} ${table.nowrap}`}>{METHOD.get(row.method) ?? row.method}</td>
                    <td className={`${table.td} ${table.nowrap}`}>
                      {row.reference ?? <span className={table.muted}>None</span>}
                    </td>
                    <td className={`${table.td} ${table.numeric}`}>{row.amount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <ListFooter
          shown={rows.length}
          total={total}
          noun={noun}
          query={query}
          paging={{
            page: shown.page,
            path: '/payments',
            params: { show, q: query, client: client?.slug, project: project?.slug },
          }}
        />
      </div>
    </main>
  );
}
