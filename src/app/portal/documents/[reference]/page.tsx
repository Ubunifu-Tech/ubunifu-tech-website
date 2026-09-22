import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requireClient } from '@/lib/console/auth';
import {
  markSignatureRequestViewed,
  DOCUMENT_KIND_LABEL,
  PORTAL_DOCUMENT_STATUS_LABEL,
} from '@/lib/console/documents';
import { formatDate } from '@/lib/console/money';
import { RespondForm, SignForm } from '../SignForm';
import { ContractSheet } from '@/components/documents/ContractSheet';
import { PrintButton } from '@/app/admin/receipts/PrintButton';
import { getOrg } from '@/lib/console/org';
import sheet from '@/app/admin/receipts/Receipt.module.css';
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
      project: {
        select: { name: true, slug: true, client: { select: { name: true, legalName: true } } },
      },
      signatureRequests: {
        // 'declined' is in here deliberately: a client who said no still has
        // to be able to open what they said no to, and so does anyone reading
        // this later.
        where: { status: { in: ['sent', 'viewed', 'signed', 'declined'] } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true,
          status: true,
          sentAt: true,
          expiresAt: true,
          respondedAt: true,
          responseNote: true,
          respondedBy: { select: { name: true } },
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
  if (request.status === 'sent') await markSignatureRequestViewed(request.id);

  const signature = request.signatures[0];
  const expired = request.expiresAt !== null && request.expiresAt.getTime() < now.getTime();
  const declined = request.status === 'declined';
  // Asking for changes does not close the request, so signing stays open —
  // declining does close it, and so does the clock.
  const canSign = !signature && !expired && !declined;

  const org = await getOrg();

  return (
    <main className={styles.page}>
      <div className={sheet.toolbar}>
        <Link href="/portal/documents" className={styles.backLink}>
          ← Documents
        </Link>
        <PrintButton />
        <span
          className={`${forms.badge} ${
            signature
              ? forms.badgeGood
              : declined
                ? forms.badgeBad
                : expired
                  ? forms.badgeWarn
                  : forms.badgeLive
          }`}
        >
          {signature
            ? `Signed ${formatDate(signature.signedAt)}`
            : expired
              ? 'This request has expired'
              : PORTAL_DOCUMENT_STATUS_LABEL[document.status]}
        </span>
      </div>

      <div className={sheet.toolbar}>
        {/* Not once it is signed: "we are working on a new version" is untrue the
            moment they decide this one is fine after all. */}
        {request.respondedAt && !signature && (
          <div className={styles.notice} role="status">
            <p>
              {declined
                ? `You declined this on ${formatDate(request.respondedAt)}. Nothing was signed and nothing has been charged.`
                : `You asked for changes on ${formatDate(request.respondedAt)}. We are working on a new version.`}
            </p>
            <p>
              <strong>
                {request.respondedBy?.name ? `${request.respondedBy.name} wrote:` : 'You wrote:'}
              </strong>{' '}
              {request.responseNote}
            </p>
          </div>
        )}

        {expired && !signature && (
          <p className={styles.notice} role="status">
            This signing request has run out. Nothing is lost. Ask in Help and we will send it again.
          </p>
        )}
      </div>

      <ContractSheet
        org={org}
        kind={DOCUMENT_KIND_LABEL[document.kind]}
        title={document.title}
        reference={document.reference}
        client={document.project.client}
        projectName={document.project.name}
        sentAt={request.sentAt}
        bodyMarkdown={request.version.bodyMarkdown}
        terms={request.termsVersion}
        signature={signature ?? null}
      />

      <div className={`${sheet.toolbar} ${sheet.noPrint} ${styles.signArea}`}>
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

      {canSign && !request.respondedAt && (
        <section className={forms.card}>
          <div className={forms.cardHeader}>
            <h2 className={forms.cardTitle}>Not ready to sign?</h2>
            <span className={forms.cardMeta}>Neither of these signs anything</span>
          </div>
          <RespondForm requestId={request.id} />
        </section>
      )}
      </div>
    </main>
  );
}
