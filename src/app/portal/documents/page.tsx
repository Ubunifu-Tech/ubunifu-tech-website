import Link from 'next/link';
import { db } from '@/lib/db';
import { requireClient } from '@/lib/console/auth';
import { DOCUMENT_KIND_LABEL, PORTAL_DOCUMENT_STATUS_LABEL } from '@/lib/console/documents';
import { formatShortDate } from '@/lib/console/money';
import styles from '../Portal.module.css';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';

export const metadata = { title: 'Documents' };

export default async function PortalDocuments() {
  const actor = await requireClient();

  const documents = await db.document.findMany({
    where: {
      project: { clientId: actor.clientId, deletedAt: null },
      status: { notIn: ['draft', 'internal_review'] },
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      reference: true,
      title: true,
      kind: true,
      status: true,
      project: { select: { name: true } },
      signatureRequests: {
        where: { status: { in: ['sent', 'viewed', 'signed', 'declined'] } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          sentAt: true,
          status: true,
          respondedAt: true,
          signatures: { select: { signedAt: true, initials: true } },
        },
      },
    },
  });

  // Waiting on THEM. A document they have already answered — declined, or
  // asked for changes on — is waiting on us, and telling somebody they owe us
  // a signature they have explicitly refused is the fastest way to be ignored.
  const waiting = documents.filter((document) => {
    const request = document.signatureRequests[0];
    return (
      request !== undefined &&
      request.signatures.length === 0 &&
      request.respondedAt === null &&
      request.status !== 'declined'
    );
  }).length;

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <h1 className={styles.heading}>
          Your <span className={styles.headingAccent}>documents</span>
        </h1>
        <p className={styles.lead}>
          {waiting === 0
            ? 'Nothing is waiting on you. Everything you have signed stays here.'
            : `${waiting} ${waiting === 1 ? 'document is' : 'documents are'} waiting for your signature.`}
        </p>
      </div>

      <div className={table.frame}>
        <div className={table.toolbar}>
          <div className={table.toolbarText}>
            <h2 className={table.title}>Everything we have sent you</h2>
            <span className={table.count}>
              {documents.length} {documents.length === 1 ? 'document' : 'documents'}
            </span>
          </div>
        </div>
        <div className={table.scroll}>
          <table className={table.table}>
            <thead>
              <tr>
                <th className={table.th} scope="col">Document</th>
                <th className={table.th} scope="col">Kind</th>
                <th className={table.th} scope="col">Project</th>
                <th className={table.th} scope="col">Sent</th>
                <th className={table.th} scope="col">State</th>
                <th className={`${table.th} ${table.actionsHead}`} scope="col">
                  <span className={table.muted}>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {documents.length === 0 ? (
                <tr>
                  <td className={table.emptyCell} colSpan={6}>
                    <p className={table.emptyTitle}>Nothing sent to you yet.</p>
                    <p className={table.emptyHint}>
                      Proposals and agreements will appear here when they are ready.
                    </p>
                  </td>
                </tr>
              ) : (
                documents.map((document) => {
                  const request = document.signatureRequests[0];
                  const signature = request?.signatures[0];
                  const answered = request?.respondedAt !== null && request?.respondedAt !== undefined;
                  const declined = request?.status === 'declined';
                  return (
                    <tr key={document.id} className={table.tr}>
                      <td className={`${table.td} ${table.primary}`}>
                        <Link
                          href={`/portal/documents/${document.reference}`}
                          className={table.link}
                        >
                          {document.title}
                        </Link>
                        <span className={table.sub}>{document.reference}</span>
                      </td>
                      <td className={`${table.td} ${table.nowrap}`}>
                        {DOCUMENT_KIND_LABEL[document.kind]}
                      </td>
                      <td className={`${table.td} ${table.name}`}>{document.project.name}</td>
                      <td className={`${table.td} ${table.nowrap}`}>
                        {formatShortDate(request?.sentAt)}
                      </td>
                      <td className={table.td}>
                        <span
                          className={`${forms.badge} ${
                            signature
                              ? forms.badgeGood
                              : declined
                                ? forms.badgeBad
                                : forms.badgeWarn
                          }`}
                        >
                          {signature
                            ? `Signed ${formatShortDate(signature.signedAt)}`
                            : PORTAL_DOCUMENT_STATUS_LABEL[document.status]}
                        </span>
                      </td>
                      <td className={`${table.td} ${table.actions}`}>
                        <span className={table.actionGroup}>
                          <Link
                            href={`/portal/documents/${document.reference}`}
                            className={table.action}
                          >
                            {signature || answered ? 'View' : 'Read and sign'}
                          </Link>
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
