import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/console/auth';
import { DOCUMENT_KIND_LABEL } from '@/lib/console/documents';
import { authorText, prepareDocument } from '@/lib/console/document-ready';
import { getOrg } from '@/lib/console/org';
import { ContractSheet } from '@/components/documents/ContractSheet';
import { PrintButton } from '../../../receipts/PrintButton';
import styles from '../../../Admin.module.css';
import sheet from '../../../receipts/Receipt.module.css';

export async function generateMetadata({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  return { title: decodeURIComponent(reference) };
}

/**
 * The document as the client reads it, ready to print or save. Once sent, it
 * is the version with the client (or the signed one); before that, the draft
 * with the fee table filled in as it would go.
 */
export default async function PrintDocument({ params }: { params: Promise<{ reference: string }> }) {
  await requirePermission('documents');
  const { reference } = await params;

  const [document, org] = await Promise.all([
    db.document.findUnique({
      // A removed project's documents still print: they are the record.
      where: { reference: decodeURIComponent(reference) },
      select: {
        reference: true,
        title: true,
        kind: true,
        project: {
          select: {
            id: true,
            name: true,
            currency: true,
            client: { select: { id: true, slug: true, name: true, legalName: true } },
          },
        },
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
          select: { bodyMarkdown: true, sourceMarkdown: true },
        },
        signatureRequests: {
          where: { status: { in: ['sent', 'viewed', 'signed', 'declined'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            sentAt: true,
            version: { select: { bodyMarkdown: true } },
            termsVersion: { select: { title: true, bodyMarkdown: true } },
            signatures: { select: { signerName: true, initials: true, signedAt: true } },
          },
        },
      },
    }),
    getOrg(),
  ]);
  if (!document) notFound();

  const sent = document.signatureRequests[0];
  const latest = document.versions[0];
  const body = sent
    ? sent.version.bodyMarkdown
    : latest
      ? (
          await prepareDocument({
            kind: document.kind,
            source: authorText(latest),
            project: {
              id: document.project.id,
              currency: document.project.currency,
              clientId: document.project.client.id,
              clientSlug: document.project.client.slug,
            },
          })
        ).final
      : '';

  return (
    <main className={styles.page}>
      <div className={sheet.toolbar}>
        <Link href={`/documents/${document.reference}`} className={styles.backLink}>
          ← {document.reference}
        </Link>
        <PrintButton />
      </div>
      <ContractSheet
        org={org}
        kind={DOCUMENT_KIND_LABEL[document.kind]}
        title={document.title}
        reference={document.reference}
        client={document.project.client}
        projectName={document.project.name}
        sentAt={sent?.sentAt ?? null}
        bodyMarkdown={body}
        terms={sent?.termsVersion ?? null}
        signature={sent?.signatures[0] ?? null}
      />
    </main>
  );
}
