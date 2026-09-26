import Link from 'next/link';
import { db } from '@/lib/db';
import type { Prisma } from '@/generated/prisma/client';
import { requirePermission } from '@/lib/console/auth';
import { DOCUMENT_KIND_LABEL, DOCUMENT_STATUS_LABEL } from '@/lib/console/documents';
import { formatShortDate } from '@/lib/console/money';
import { liveDocument } from '@/lib/console/live';
import { ListFooter, ListToolbar, searchText } from '@/components/console/ListToolbar';
import styles from '../Admin.module.css';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';

export const metadata = { title: 'Documents' };

const STATUS_BADGE: Record<string, string> = {
  draft: '',
  internal_review: '',
  sent: forms.badgeLive,
  viewed: forms.badgeLive,
  changes_requested: forms.badgeWarn,
  signed: forms.badgeGood,
  declined: forms.badgeBad,
  expired: forms.badgeWarn,
  superseded: '',
};

/* 'With the client' used to include changes_requested, which is the one state
   that means the opposite — they have answered and the next move is ours. The
   two now have separate views, because a list of what you are waiting on is
   only useful if nothing on it is waiting on you. */
const FILTERS = [
  { key: 'open', label: 'With the client' },
  { key: 'back', label: 'Back to us' },
  { key: 'drafts', label: 'Drafts' },
  { key: 'signed', label: 'Signed' },
  { key: 'all', label: 'Everything' },
] as const;

function filterToWhere(key: string): Prisma.DocumentWhereInput {
  switch (key) {
    case 'back':
      return { status: { in: ['changes_requested', 'declined'] } };
    case 'drafts':
      return { status: { in: ['draft', 'internal_review'] } };
    case 'signed':
      return { status: 'signed' };
    case 'all':
      return {};
    default:
      return { status: { in: ['sent', 'viewed'] } };
  }
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string; q?: string }>;
}) {
  await requirePermission('documents');
  const { show, q } = await searchParams;
  const active = FILTERS.some((f) => f.key === show) ? show! : 'open';
  const query = searchText(q);

  const matching: Prisma.DocumentWhereInput = query
    ? {
        OR: [
          { reference: { contains: query, mode: 'insensitive' } },
          { title: { contains: query, mode: 'insensitive' } },
          { project: { name: { contains: query, mode: 'insensitive' } } },
          { project: { client: { name: { contains: query, mode: 'insensitive' } } } },
        ],
      }
    : {};

  const viewCounts = await Promise.all(
    FILTERS.map((filter) =>
      db.document.count({ where: { AND: [liveDocument, filterToWhere(filter.key), matching] } }),
    ),
  );
  const total = viewCounts[FILTERS.findIndex((f) => f.key === active)] ?? 0;

  const documents = await db.document.findMany({
    where: { AND: [liveDocument, filterToWhere(active), matching] },
    orderBy: { updatedAt: 'desc' },
    take: 200,
    select: {
      id: true,
      reference: true,
      title: true,
      kind: true,
      status: true,
      updatedAt: true,
      project: {
        select: { name: true, slug: true, client: { select: { name: true, slug: true } } },
      },
      signatureRequests: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { sentAt: true, signatures: { select: { signedAt: true } } },
      },
    },
  });

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <h1 className={styles.heading}>
            Proposals and <span className={styles.headingAccent}>agreements</span>
          </h1>
          <p className={styles.lead}>
            Proposals and agreements, from draft to signed.
          </p>
        </div>
      </div>

      <div className={table.frame}>
        <ListToolbar
          path="/documents"
          views={FILTERS.map((filter, index) => ({ ...filter, count: viewCounts[index] ?? 0 }))}
          current={active}
          defaultView="open"
          query={query}
          searchLabel="Search documents"
        />
        <div className={table.scroll}>
          <table className={table.table}>
            <thead>
              <tr>
                <th className={table.th} scope="col">Document</th>
                <th className={table.th} scope="col">Number</th>
                <th className={table.th} scope="col">Kind</th>
                <th className={table.th} scope="col">Client</th>
                <th className={table.th} scope="col">Project</th>
                <th className={table.th} scope="col">State</th>
                <th className={table.th} scope="col">Signed</th>
                <th className={table.th} scope="col">Last touched</th>
              </tr>
            </thead>
            <tbody>
              {documents.length === 0 ? (
                <tr>
                  <td className={table.emptyCell} colSpan={8}>
                    <p className={table.emptyTitle}>
                      {query
                        ? `No documents match “${query}” here.`
                        : active === 'open'
                          ? 'Nothing with a client.'
                          : 'Nothing here.'}
                    </p>
                    <p className={table.emptyHint}>
                      {query
                        ? 'Try another view, or search for something else.'
                        : 'Start one from a project’s Documents tab.'}
                    </p>
                  </td>
                </tr>
              ) : (
                documents.map((document) => {
                  const request = document.signatureRequests[0];
                  return (
                    <tr key={document.id} className={table.tr}>
                      <td className={`${table.td} ${table.primary}`}>
                        <Link href={`/documents/${document.reference}`} className={table.link}>
                          {document.title}
                        </Link>
                      </td>
                      <td className={`${table.td} ${table.nowrap}`}>{document.reference}</td>
                      <td className={`${table.td} ${table.nowrap}`}>
                        {DOCUMENT_KIND_LABEL[document.kind]}
                      </td>
                      <td className={`${table.td} ${table.name}`}>
                        <Link
                          href={`/clients/${document.project.client.slug}`}
                          className={table.link}
                        >
                          {document.project.client.name}
                        </Link>
                      </td>
                      <td className={`${table.td} ${table.name}`}>
                        <Link href={`/projects/${document.project.slug}`} className={table.link}>
                          {document.project.name}
                        </Link>
                      </td>
                      <td className={table.td}>
                        <span className={`${forms.badge} ${STATUS_BADGE[document.status]}`}>
                          {DOCUMENT_STATUS_LABEL[document.status]}
                        </span>
                      </td>
                      <td className={`${table.td} ${table.nowrap}`}>
                        {request?.signatures[0] ? (
                          formatShortDate(request.signatures[0].signedAt)
                        ) : (
                          <span className={table.muted}>Not yet</span>
                        )}
                      </td>
                      <td className={`${table.td} ${table.nowrap}`}>
                        {formatShortDate(document.updatedAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <ListFooter shown={documents.length} total={total} noun={['document', 'documents']} query={query} />
      </div>
    </main>
  );
}
