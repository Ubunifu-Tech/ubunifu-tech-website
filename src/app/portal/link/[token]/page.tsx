import type { ReactNode } from 'react';
import { db } from '@/lib/db';
import { BrandMark } from '@/components/BrandMark';
import { ContractSheet } from '@/components/documents/ContractSheet';
import { ReviewRound } from '@/components/console/ReviewRound';
import { DOCUMENT_KIND_LABEL } from '@/lib/console/documents';
import { formatDate } from '@/lib/console/money';
import { getOrg } from '@/lib/console/org';
import { readSharedLink, type SharedLink } from '@/lib/console/shared-links';
import { PrintButton } from '@/app/admin/receipts/PrintButton';
import { SignForm } from '../../documents/SignForm';
import { ReviewAnswer } from '../../projects/[slug]/ReviewAnswer';
import { answerWithLink, signWithLink } from './actions';
import { Opened } from './Opened';
import sheet from '@/app/admin/receipts/Receipt.module.css';
import styles from '../../Portal.module.css';
import forms from '@/styles/forms.module.css';

/**
 * Deliberately plain, so a chat app's preview of the link shows our name and
 * not the document or the person it is for.
 */
export const metadata = { title: { absolute: 'Ubunifu Technologies' } };

/**
 * Where a link shared by hand opens: one document to sign, or one review to
 * answer, for the one person it was made for. No sign-in and no account;
 * the link is the permission, and it opens nothing else.
 */
export default async function SharedLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token: raw } = await params;
  const token = decodeURIComponent(raw);
  // Read once, so every comparison on this render agrees with every other.
  const now = new Date();
  const [link, org] = await Promise.all([readSharedLink(token), getOrg()]);

  return (
    <main className={styles.page}>
      <div className={styles.linkHead}>
        <BrandMark className={styles.brandMark} title="Ubunifu Technologies" />
        <span className={styles.brandText}>Ubunifu Technologies</span>
      </div>
      {!link ? (
        <Notice>
          This link has run out or was replaced by a newer one. Ask whoever sent it to you for a new
          link{org.phone ? `, or call us on ${org.phone}` : ''}.
        </Notice>
      ) : link.thing === 'SignatureRequest' ? (
        <SignThroughLink link={link} token={token} org={org} now={now} />
      ) : (
        <ReviewThroughLink link={link} token={token} />
      )}
      <p className={`${styles.note} ${styles.after}`}>
        Questions? Email {org.email}
        {org.phone ? ` or call ${org.phone}` : ''}.
      </p>
    </main>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <p className={styles.notice} role="status">
      {children}
    </p>
  );
}

async function SignThroughLink({
  link,
  token,
  org,
  now,
}: {
  link: SharedLink;
  token: string;
  org: Awaited<ReturnType<typeof getOrg>>;
  now: Date;
}) {
  const request = await db.signatureRequest.findFirst({
    where: {
      id: link.thingId,
      document: { project: { clientId: link.contact.clientId, deletedAt: null } },
    },
    select: {
      id: true,
      status: true,
      sentAt: true,
      expiresAt: true,
      version: { select: { bodyMarkdown: true } },
      termsVersion: { select: { version: true, title: true, bodyMarkdown: true } },
      signatures: { select: { signerName: true, initials: true, signedAt: true } },
      document: {
        select: {
          title: true,
          kind: true,
          reference: true,
          project: { select: { name: true, client: { select: { name: true, legalName: true } } } },
        },
      },
    },
  });

  if (!request || request.status === 'cancelled') {
    return (
      <Notice>
        This version was withdrawn, so there is nothing to sign here. We will send you the new one.
      </Notice>
    );
  }

  const signature = request.signatures[0] ?? null;
  const expired = request.expiresAt !== null && request.expiresAt.getTime() < now.getTime();
  const declined = request.status === 'declined';
  const canSign = !signature && !expired && !declined;

  return (
    <>
      {canSign && <Opened token={token} />}
      <div className={sheet.toolbar}>
        {signature ? (
          <span className={`${forms.badge} ${forms.badgeGood}`}>
            Signed {formatDate(signature.signedAt)}
          </span>
        ) : (
          <span className={`${forms.badge} ${forms.badgeLive}`}>
            For {link.contact.name} to read and sign
          </span>
        )}
        <PrintButton />
      </div>

      {expired && !signature && (
        <Notice>The time to sign this has passed. Ask us and we will send it again.</Notice>
      )}
      {declined && !signature && (
        <Notice>This version was declined, so it is closed. Nothing was signed.</Notice>
      )}

      <ContractSheet
        org={org}
        kind={DOCUMENT_KIND_LABEL[request.document.kind]}
        title={request.document.title}
        reference={request.document.reference}
        client={request.document.project.client}
        projectName={request.document.project.name}
        sentAt={request.sentAt}
        bodyMarkdown={request.version.bodyMarkdown}
        terms={request.termsVersion}
        signature={signature}
      />

      {canSign && (
        <div className={`${sheet.toolbar} ${sheet.noPrint} ${styles.signArea}`}>
          <section className={forms.card}>
            <div className={forms.cardHeader}>
              <h2 className={forms.cardTitle}>Sign it</h2>
            </div>
            <SignForm
              requestId={request.id}
              termsTitle={request.termsVersion?.title ?? null}
              termsVersion={request.termsVersion?.version ?? null}
              signerName={link.contact.name}
              sign={signWithLink}
              hidden={{ token }}
              viaLink
            />
            <p className={styles.note}>
              Not ready to sign, or something needs changing? Tell us before you sign.
            </p>
          </section>
        </div>
      )}
    </>
  );
}

async function ReviewThroughLink({ link, token }: { link: SharedLink; token: string }) {
  const review = await db.projectReview.findFirst({
    where: { id: link.thingId, project: { clientId: link.contact.clientId, deletedAt: null } },
    select: {
      id: true,
      round: true,
      title: true,
      previewUrl: true,
      note: true,
      status: true,
      createdAt: true,
      answeredAt: true,
      answer: true,
      answeredBy: { select: { name: true } },
      project: { select: { name: true } },
    },
  });

  if (!review || review.status === 'withdrawn') {
    return (
      <Notice>
        This round was replaced by a newer version. We will send you a link to the latest one.
      </Notice>
    );
  }

  return (
    <section className={forms.card}>
      <div className={forms.cardHeader}>
        <h1 className={forms.cardTitle}>
          {review.status === 'open' ? 'Ready for your review' : 'Your review'}
        </h1>
        <span className={forms.cardMeta}>{review.project.name}</span>
      </div>
      <ReviewRound review={review} audience="client">
        {review.status === 'open' && (
          <ReviewAnswer reviewId={review.id} answer={answerWithLink} hidden={{ token }} />
        )}
      </ReviewRound>
    </section>
  );
}
