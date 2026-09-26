import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { can, requirePermission } from '@/lib/console/auth';
import { INVOICE_STATUS_LABEL } from '@/lib/console/billing-labels';
import { DOCUMENT_KIND_LABEL, DOCUMENT_STATUS_LABEL } from '@/lib/console/documents';
import { formatMoney, formatShortDate } from '@/lib/console/money';
import { STAFF_LABEL } from '@/lib/console/project-status';
import { RestoreClient } from './RestoreClient';
import styles from '../../Admin.module.css';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = await db.client.findFirst({
    where: { slug, deletedAt: { not: null } },
    select: { name: true },
  });
  return { title: client ? `${client.name}, removed` : 'Removed client' };
}

/**
 * A removed client's records: the projects, invoices, receipts and signed
 * documents kept when they were removed, each opening read only. Money and
 * documents show only to the people allowed to see them anywhere else.
 */
export default async function RemovedClient({ params }: { params: Promise<{ slug: string }> }) {
  const staff = await requirePermission('clients');
  const seesMoney = can(staff, 'invoices');
  const seesDocuments = can(staff, 'documents');
  const { slug } = await params;

  const client = await db.client.findFirst({
    where: { slug, deletedAt: { not: null } },
    select: {
      id: true,
      name: true,
      legalName: true,
      country: true,
      deletedAt: true,
      projects: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          reference: true,
          status: true,
          deletedAt: true,
          documents: {
            orderBy: { createdAt: 'desc' },
            select: { reference: true, title: true, kind: true, status: true },
          },
        },
      },
      invoices: {
        where: { status: { not: 'draft' } },
        orderBy: { createdAt: 'desc' },
        select: {
          number: true,
          status: true,
          issuedAt: true,
          totalMinor: true,
          paidMinor: true,
          currency: true,
          payments: {
            orderBy: { receivedAt: 'asc' },
            select: {
              amountMinor: true,
              currency: true,
              receivedAt: true,
              reversedAt: true,
              receipt: { select: { number: true } },
              refunds: { select: { number: true, amountMinor: true, refundedAt: true } },
            },
          },
        },
      },
      contacts: {
        orderBy: { name: 'asc' },
        select: { id: true, name: true, email: true, deletedAt: true },
      },
    },
  });
  if (!client?.deletedAt) notFound();
  const removedAt = client.deletedAt;

  const removal = await db.auditEvent.findFirst({
    where: { action: 'client.removed', entityId: client.id },
    orderBy: { createdAt: 'desc' },
    select: { actorId: true },
  });
  const remover = removal?.actorId
    ? await db.staffUser.findUnique({ where: { id: removal.actorId }, select: { name: true } })
    : null;

  const withIt = client.projects.filter(
    (project) => project.deletedAt?.getTime() === removedAt.getTime(),
  ).length;
  const documents = client.projects.flatMap((project) =>
    project.documents.map((document) => ({ ...document, project: project.reference })),
  );
  const invoices = client.invoices;
  const receipts = invoices.flatMap((invoice) =>
    invoice.payments.flatMap((payment) =>
      payment.receipt
        ? [{ ...payment, number: payment.receipt.number, invoice: invoice.number }]
        : [],
    ),
  );
  const refunds = receipts.flatMap((payment) =>
    payment.refunds.map((refund) => ({
      ...refund,
      currency: payment.currency,
      invoice: payment.invoice,
    })),
  );

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <Link href="/removed" className={styles.backLink}>
            ← Removed clients
          </Link>
          <h1 className={styles.heading}>{client.name}</h1>
          <p className={styles.lead}>
            Removed on {formatShortDate(removedAt)}
            {remover ? ` by ${remover.name}` : ''}.
          </p>
        </div>
        <div className={styles.headActions}>
          <RestoreClient clientId={client.id} clientName={client.name} projects={withIt} />
        </div>
      </div>

      <div className={styles.stack}>
        <div className={table.frame}>
          <div className={table.toolbar}>
            <div className={table.toolbarText}>
              <h2 className={table.title}>Projects</h2>
              <span className={table.count}>{client.projects.length}</span>
            </div>
          </div>
          <div className={table.scroll}>
            <table className={table.table}>
              <thead>
                <tr>
                  <th className={table.th} scope="col">
                    Project
                  </th>
                  <th className={table.th} scope="col">
                    Number
                  </th>
                  <th className={table.th} scope="col">
                    Stage when removed
                  </th>
                  <th className={table.th} scope="col">
                    Removed
                  </th>
                </tr>
              </thead>
              <tbody>
                {client.projects.length === 0 ? (
                  <tr>
                    <td className={table.emptyCell} colSpan={4}>
                      <p className={table.emptyTitle}>No projects.</p>
                    </td>
                  </tr>
                ) : (
                  client.projects.map((project) => (
                    <tr key={project.id} className={table.tr}>
                      <td className={`${table.td} ${table.primary}`}>{project.name}</td>
                      <td className={`${table.td} ${table.nowrap}`}>{project.reference}</td>
                      <td className={table.td}>{STAFF_LABEL[project.status]}</td>
                      <td className={`${table.td} ${table.nowrap}`}>
                        {project.deletedAt?.getTime() === removedAt.getTime()
                          ? 'With the client'
                          : formatShortDate(project.deletedAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {seesMoney && (
          <div className={table.frame}>
            <div className={table.toolbar}>
              <div className={table.toolbarText}>
                <h2 className={table.title}>Invoices</h2>
                <span className={table.count}>{invoices.length}</span>
              </div>
            </div>
            <div className={table.scroll}>
              <table className={table.table}>
                <thead>
                  <tr>
                    <th className={table.th} scope="col">
                      Invoice
                    </th>
                    <th className={table.th} scope="col">
                      Issued
                    </th>
                    <th className={table.th} scope="col">
                      Status
                    </th>
                    <th className={`${table.th} ${table.numericHead}`} scope="col">
                      Total
                    </th>
                    <th className={`${table.th} ${table.numericHead}`} scope="col">
                      Unpaid
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.length === 0 ? (
                    <tr>
                      <td className={table.emptyCell} colSpan={5}>
                        <p className={table.emptyTitle}>No invoices.</p>
                      </td>
                    </tr>
                  ) : (
                    invoices.map((invoice) => {
                      const left =
                        invoice.status === 'void'
                          ? 0
                          : Math.max(0, invoice.totalMinor - invoice.paidMinor);
                      return (
                        <tr key={invoice.number} className={table.tr}>
                          <td className={`${table.td} ${table.primary}`}>
                            <Link href={`/invoices/${invoice.number}`} className={table.link}>
                              {invoice.number}
                            </Link>
                          </td>
                          <td className={`${table.td} ${table.nowrap}`}>
                            {formatShortDate(invoice.issuedAt)}
                          </td>
                          <td className={table.td}>{INVOICE_STATUS_LABEL[invoice.status]}</td>
                          <td className={`${table.td} ${table.numeric}`}>
                            {formatMoney(invoice.totalMinor, invoice.currency)}
                          </td>
                          <td className={`${table.td} ${table.numeric}`}>
                            {left > 0 ? (
                              <span className={table.late}>
                                {formatMoney(left, invoice.currency)}
                              </span>
                            ) : (
                              <span className={table.muted}>None</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {seesMoney && receipts.length > 0 && (
          <div className={table.frame}>
            <div className={table.toolbar}>
              <div className={table.toolbarText}>
                <h2 className={table.title}>Receipts and refunds</h2>
                <span className={table.count}>{receipts.length + refunds.length}</span>
              </div>
            </div>
            <div className={table.scroll}>
              <table className={table.table}>
                <thead>
                  <tr>
                    <th className={table.th} scope="col">
                      Number
                    </th>
                    <th className={table.th} scope="col">
                      Kind
                    </th>
                    <th className={table.th} scope="col">
                      Invoice
                    </th>
                    <th className={table.th} scope="col">
                      Date
                    </th>
                    <th className={`${table.th} ${table.numericHead}`} scope="col">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.map((receipt) => (
                    <tr key={receipt.number} className={table.tr}>
                      <td className={`${table.td} ${table.primary}`}>
                        <Link href={`/receipts/${receipt.number}`} className={table.link}>
                          {receipt.number}
                        </Link>
                      </td>
                      <td className={table.td}>
                        {receipt.reversedAt ? 'Receipt, cancelled' : 'Receipt'}
                      </td>
                      <td className={`${table.td} ${table.nowrap}`}>{receipt.invoice}</td>
                      <td className={`${table.td} ${table.nowrap}`}>
                        {formatShortDate(receipt.receivedAt)}
                      </td>
                      <td className={`${table.td} ${table.numeric}`}>
                        {formatMoney(receipt.amountMinor, receipt.currency)}
                      </td>
                    </tr>
                  ))}
                  {refunds.map((refund) => (
                    <tr key={refund.number} className={table.tr}>
                      <td className={`${table.td} ${table.primary}`}>
                        <Link href={`/refunds/${refund.number}`} className={table.link}>
                          {refund.number}
                        </Link>
                      </td>
                      <td className={table.td}>Refund</td>
                      <td className={`${table.td} ${table.nowrap}`}>{refund.invoice}</td>
                      <td className={`${table.td} ${table.nowrap}`}>
                        {formatShortDate(refund.refundedAt)}
                      </td>
                      <td className={`${table.td} ${table.numeric}`}>
                        {formatMoney(refund.amountMinor, refund.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {seesDocuments && (
          <div className={table.frame}>
            <div className={table.toolbar}>
              <div className={table.toolbarText}>
                <h2 className={table.title}>Documents</h2>
                <span className={table.count}>{documents.length}</span>
              </div>
            </div>
            <div className={table.scroll}>
              <table className={table.table}>
                <thead>
                  <tr>
                    <th className={table.th} scope="col">
                      Document
                    </th>
                    <th className={table.th} scope="col">
                      Number
                    </th>
                    <th className={table.th} scope="col">
                      Project
                    </th>
                    <th className={table.th} scope="col">
                      Kind
                    </th>
                    <th className={table.th} scope="col">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {documents.length === 0 ? (
                    <tr>
                      <td className={table.emptyCell} colSpan={5}>
                        <p className={table.emptyTitle}>No documents.</p>
                      </td>
                    </tr>
                  ) : (
                    documents.map((document) => (
                      <tr key={document.reference} className={table.tr}>
                        <td className={`${table.td} ${table.primary}`}>
                          <Link href={`/documents/${document.reference}`} className={table.link}>
                            {document.title}
                          </Link>
                        </td>
                        <td className={`${table.td} ${table.nowrap}`}>{document.reference}</td>
                        <td className={`${table.td} ${table.nowrap}`}>{document.project}</td>
                        <td className={table.td}>{DOCUMENT_KIND_LABEL[document.kind]}</td>
                        <td className={table.td}>
                          {document.status === 'signed' ? (
                            <span className={`${forms.badge} ${forms.badgeGood}`}>Signed</span>
                          ) : (
                            DOCUMENT_STATUS_LABEL[document.status]
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className={table.frame}>
          <div className={table.toolbar}>
            <div className={table.toolbarText}>
              <h2 className={table.title}>People</h2>
              <span className={table.count}>{client.contacts.length}</span>
            </div>
          </div>
          <div className={table.scroll}>
            <table className={table.table}>
              <thead>
                <tr>
                  <th className={table.th} scope="col">
                    Name
                  </th>
                  <th className={table.th} scope="col">
                    Email
                  </th>
                </tr>
              </thead>
              <tbody>
                {client.contacts.map((contact) => (
                  <tr key={contact.id} className={table.tr}>
                    <td className={`${table.td} ${table.primary}`}>{contact.name}</td>
                    <td className={table.td}>
                      {contact.email ?? <span className={table.muted}>No email</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
