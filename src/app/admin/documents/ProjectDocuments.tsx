import Link from 'next/link';
import { db } from '@/lib/db';
import { can, type StaffActor } from '@/lib/console/auth';
import { DOCUMENT_KIND_LABEL, DOCUMENT_STATUS_LABEL } from '@/lib/console/documents';
import { formatRelative, formatShortDate } from '@/lib/console/money';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';

/**
 * A project's documents, with what the client said about each.
 *
 * For the Documents tab of the project page, in place of its own table:
 *
 *   <ProjectDocuments projectId={project.id} now={now} staff={staff} />
 *
 * A document the client pushed back on shows their words in the list, so
 * nobody has to open each one to find out which needs work and why. Fetches
 * its own rows, because the comment and the suggestions live on records the
 * project page does not load.
 *
 * The list itself is for anyone who can see the project, as the tab always
 * was. What the client said is only for those who may open the document,
 * which takes the documents permission, so the check is made here rather than
 * left to each caller to remember.
 */
export async function ProjectDocuments({
  projectId,
  now,
  staff,
}: {
  projectId: string;
  now: Date;
  staff: Pick<StaffActor, 'permissions'>;
}) {
  const mayDocs = can(staff, 'documents');
  const documents = await db.document.findMany({
    where: { projectId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      reference: true,
      title: true,
      kind: true,
      status: true,
      updatedAt: true,
      // The latest version we sent, and their answer to it if they gave one.
      signatureRequests: {
        where: { status: { not: 'draft' } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          status: true,
          respondedAt: true,
          responseNote: true,
          respondedBy: { select: { name: true } },
        },
      },
      _count: { select: { suggestions: { where: { status: 'open' } } } },
    },
  });

  return (
    <div className={table.frame}>
      <div className={table.toolbar}>
        <div className={table.toolbarText}>
          <h2 className={table.title}>Documents</h2>
          <span className={table.count}>{documents.length}</span>
        </div>
      </div>
      <div className={table.scroll}>
        <table className={`${table.table} ${table.compact}`}>
          <thead>
            <tr>
              <th className={table.th} scope="col">
                Document
              </th>
              <th className={table.th} scope="col">
                Status
              </th>
              <th className={table.th} scope="col">
                Updated
              </th>
            </tr>
          </thead>
          <tbody>
            {documents.length === 0 ? (
              <tr>
                <td className={table.emptyCell} colSpan={3}>
                  <p className={table.emptyTitle}>No documents yet</p>
                  {mayDocs && (
                    <p className={table.emptyHint}>Start a proposal or agreement on the right.</p>
                  )}
                </td>
              </tr>
            ) : (
              documents.map((document) => {
                // Once signed, what they raised earlier has been settled.
                const open = mayDocs && document.status !== 'signed';
                const answer = open ? document.signatureRequests[0] : undefined;
                return (
                  <tr key={document.id} className={table.tr}>
                    <td className={`${table.td} ${table.primary}`}>
                      <Link href={`/documents/${document.reference}`} className={table.link}>
                        {document.title}
                      </Link>
                      <span className={table.sub}>
                        {DOCUMENT_KIND_LABEL[document.kind]} · {document.reference}
                      </span>
                      {answer?.respondedAt && answer.responseNote && (
                        <span className={`${table.sub} ${table.clamp}`}>
                          {answer.status === 'declined' ? 'Declined' : 'Changes asked for'}
                          {answer.respondedBy ? ` by ${answer.respondedBy.name}` : ''} on{' '}
                          {formatShortDate(answer.respondedAt)}: &ldquo;{answer.responseNote}&rdquo;
                        </span>
                      )}
                      {open && document._count.suggestions > 0 && (
                        <span className={table.sub}>
                          {document._count.suggestions === 1
                            ? 'They suggested their own wording'
                            : `${document._count.suggestions} suggestions of their own wording`}
                        </span>
                      )}
                    </td>
                    <td className={table.td}>
                      <span
                        className={`${forms.badge} ${
                          document.status === 'signed'
                            ? forms.badgeGood
                            : document.status === 'declined'
                              ? forms.badgeBad
                              : ['sent', 'viewed', 'changes_requested'].includes(document.status)
                                ? forms.badgeWarn
                                : ''
                        }`}
                      >
                        {DOCUMENT_STATUS_LABEL[document.status]}
                      </span>
                    </td>
                    <td className={`${table.td} ${table.nowrap}`}>
                      {formatRelative(document.updatedAt, now)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
