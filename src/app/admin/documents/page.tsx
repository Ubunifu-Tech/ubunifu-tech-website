import Link from 'next/link';
import { db } from '@/lib/db';
import type { Prisma } from '@/generated/prisma/client';
import { requireStaff } from '@/lib/console/auth';
import { DOCUMENT_KIND_LABEL, DOCUMENT_STATUS_LABEL } from '@/lib/console/documents';
import { formatShortDate } from '@/lib/console/money';
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
  searchParams: Promise<{ show?: string }>;
}) {
  await requireStaff();
  const { show } = await searchParams;
  const active = FILTERS.some((f) => f.key === show) ? show! : 'open';

  const documents = await db.document.findMany({
    where: filterToWhere(active),
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
      versions: { select: { id: true, aiAssisted: true } },
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

      <div className={styles.filters}>
        {FILTERS.map((filter) => (
          <Link
            key={filter.key}
            href={filter.key === 'open' ? '/documents' : `/documents?show=${filter.key}`}
            className={styles.filter}
            aria-current={filter.key === active}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      <div className={table.frame}>
        <div className={table.toolbar}>
          <div className={table.toolbarText}>
            <h2 className={table.title}>
              {FILTERS.find((f) => f.key === active)?.label ?? 'Documents'}
            </h2>
            <span className={table.count}>
              {documents.length} {documents.length === 1 ? 'document' : 'documents'}
            </span>
          </div>
        </div>
        <div className={table.scroll}>
          <table className={table.table}>
            <thead>
              <tr>
                {/* Kind and the version count moved under the title: eight columns
                    did not fit a laptop, and the two that were cut are the two
                    nobody sorts or compares by. */}
                <th className={table.th} scope="col">Document</th>
                <th className={table.th} scope="col">Client</th>
                <th className={table.th} scope="col">Project</th>
                <th className={table.th} scope="col">State</th>
                <th className={table.th} scope="col">Last touched</th>
                <th className={`${table.th} ${table.actionsHead}`} scope="col">
                  <span className={table.muted}>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {documents.length === 0 ? (
                <tr>
                  <td className={table.emptyCell} colSpan={6}>
                    <p className={table.emptyTitle}>
                      {active === 'open' ? 'Nothing with a client.' : 'Nothing here.'}
                    </p>
                    <p className={table.emptyHint}>
                      Start one from a project&rsquo;s Documents tab.
                    </p>
                  </td>
                </tr>
              ) : (
                documents.map((document) => {
                  const request = document.signatureRequests[0];
                  const aiUsed = document.versions.some((version) => version.aiAssisted);
                  return (
                    <tr key={document.id} className={table.tr}>
                      <td className={`${table.td} ${table.primary}`}>
                        <Link href={`/documents/${document.reference}`} className={table.link}>
                          {document.title}
                        </Link>
                        <span className={table.sub}>
                          {document.reference} · {DOCUMENT_KIND_LABEL[document.kind]} ·{' '}
                          {document.versions.length}{' '}
                          {document.versions.length === 1 ? 'version' : 'versions'}
                          {aiUsed ? ' · drafted with help' : ''}
                        </span>
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
                        {request?.signatures[0] && (
                          <span className={table.sub}>
                            {formatShortDate(request.signatures[0].signedAt)}
                          </span>
                        )}
                      </td>
                      <td className={`${table.td} ${table.nowrap}`}>
                        {formatShortDate(document.updatedAt)}
                      </td>
                      <td className={`${table.td} ${table.actions}`}>
                        <span className={table.actionGroup}>
                          <Link href={`/documents/${document.reference}`} className={table.action}>
                            Open
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
