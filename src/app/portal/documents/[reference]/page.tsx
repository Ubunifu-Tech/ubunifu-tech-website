import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requireClient } from '@/lib/console/auth';
import {
  DOCUMENT_KIND_LABEL,
  DOCUMENT_STATUS_LABEL,
  renderMarkdown,
} from '@/lib/console/documents';
import { formatDate } from '@/lib/console/money';
import { SignForm } from '../SignForm';
import { markViewed } from '../actions';
import styles from '../../Portal.module.css';
import forms from '@/styles/forms.module.css';

export async function generateMetadata({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  return { title: decodeURIComponent(reference) };
}

/**
 * A document, as the client reads it.
 *
 * The version shown is the one pinned to the signing request, never the latest
 * draft — so what is on screen is exactly what the fingerprint was taken over
 * and exactly what signing will attest to.
 */
export default async function PortalDocument({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const actor = await requireClient();
  const { reference } = await params;
  // Read once, so every comparison on this render agrees with every other.
  const now = new Date();

  const document = await db.document.findFirst({
    where: {
      reference: decodeURIComponent(reference),
      // Scoped here: another client's document does not match at all.
      project: { clientId: actor.clientId },
      // A draft is ours until we send it.
      status: { notIn: ['draft', 'internal_review'] },
    },
    select: {
      id: true,
      reference: true,
      title: true,
      kind: true,
      status: true,
      project: { select: { name: true, reference: true, slug: true } },
      signatureRequests: {
        where: { status: { in: ['sent', 'viewed', 'signed'] } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true,
          status: true,
          sentAt: true,
          expiresAt: true,
          version: { select: { bodyMarkdown: true, version: true } },
          termsVersion: {
            select: { id: true, version: true, title: true, bodyMarkdown: true },
          },
          signatures: {
            select: { initials: true, signerName: true, signedAt: true },
          },
        },
      },
    },
  });

  if (!document) notFound();

  const request = document.signatureRequests[0];
  if (!request) notFound();

  // Recorded once, so we know whether they have actually opened it.
  if (request.status === 'sent') await markViewed(request.id);

  const signature = request.signatures[0];
  const expired = request.expiresAt !== null && request.expiresAt.getTime() < now.getTime();
  const canSign = !signature && !expired;

  return (
    <main className={`${styles.page} ${styles.medium}`}>
      <div className={styles.pageHead}>
        <Link href="/portal/documents" className={styles.projectMeta}>
          ← Documents
        </Link>
        <h1 className={styles.heading}>{document.title}</h1>
        <p className={styles.lead}>
          {DOCUMENT_KIND_LABEL[document.kind]} · {document.reference} ·{' '}
          <Link href={`/portal/projects/${document.project.slug}`}>{document.project.name}</Link>
        </p>
        <p>
          <span
            className={`${forms.badge} ${signature ? forms.badgeGood : expired ? forms.badgeWarn : forms.badgeLive}`}
          >
            {signature
              ? `Signed ${formatDate(signature.signedAt)}`
              : expired
                ? 'This request has expired'
                : DOCUMENT_STATUS_LABEL[document.status]}
          </span>
        </p>
      </div>

      {signature && (
        <p className={styles.notice} role="status">
          Signed by {signature.signerName} as &ldquo;{signature.initials}&rdquo; on{' '}
          {formatDate(signature.signedAt)}. This is your copy and it stays here.
        </p>
      )}

      {expired && !signature && (
        <p className={styles.notice} role="status">
          This signing request has run out. Nothing is lost — email us and we will send it again.
        </p>
      )}

      <section className={forms.card}>
        <div className={forms.cardHeader}>
          <h2 className={forms.cardTitle}>{document.title}</h2>
          <span className={forms.cardMeta}>
            Version {request.version.version} · sent {formatDate(request.sentAt)}
          </span>
        </div>
        <div
          className={forms.prose}
          // Escaped first; only headings, paragraphs, lists and emphasis are
          // reintroduced by the renderer.
          dangerouslySetInnerHTML={{ __html: renderMarkdown(request.version.bodyMarkdown) }}
        />
      </section>

      {request.termsVersion && (
        <section className={forms.card}>
          <div className={forms.cardHeader}>
            <h2 className={forms.cardTitle}>{request.termsVersion.title}</h2>
            <span className={forms.cardMeta}>
              Version {request.termsVersion.version} — the exact text you are accepting
            </span>
          </div>
          <div
            className={forms.prose}
            dangerouslySetInnerHTML={{
              __html: renderMarkdown(request.termsVersion.bodyMarkdown),
            }}
          />
        </section>
      )}

      {canSign && (
        <section className={forms.card}>
          <div className={forms.cardHeader}>
            <h2 className={forms.cardTitle}>Sign it</h2>
          </div>
          <SignForm
            requestId={request.id}
            termsTitle={request.termsVersion?.title ?? null}
            termsVersion={request.termsVersion?.version ?? null}
            signerName={actor.name}
          />
        </section>
      )}
    </main>
  );
}
