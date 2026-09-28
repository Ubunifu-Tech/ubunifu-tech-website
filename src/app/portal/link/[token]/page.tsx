import type { ReactNode } from 'react';
import { db } from '@/lib/db';
import { BrandMark } from '@/components/BrandMark';
import { ContractSheet, sheetStateOf } from '@/components/documents/ContractSheet';
import { ReviewRound } from '@/components/console/ReviewRound';
import { mainContactOf } from '@/lib/console/contacts';
import { DOCUMENT_KIND_LABEL, shortHash } from '@/lib/console/documents';
import { formatDate } from '@/lib/console/money';
import { getOrg } from '@/lib/console/org';
import { readSharedLink, type SharedLink } from '@/lib/console/shared-links';
import { isSignedCopy, signedNotice, type SignedCopy } from '@/lib/console/signing';
import { PrintButton } from '@/app/admin/receipts/PrintButton';
import { AskAgain, RespondForm, SignForm } from '../../documents/SignForm';
import { ReviewAnswer } from '../../projects/[slug]/ReviewAnswer';
import { answerWithLink, askAgainWithLink, respondWithLink, signWithLink } from './actions';
import { Opened } from './Opened';
import { HideAddressWhilePrinting } from './HideAddressWhilePrinting';
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
export default async function SharedLinkPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ signed?: string }>;
}) {
  const { token } = await params;
  const { signed } = await searchParams;
  // Read once, so every comparison on this render agrees with every other.
  const now = new Date();
  const [link, org] = await Promise.all([readSharedLink(token), getOrg()]);

  return (
    <main className={styles.page}>
      <div className={`${styles.linkHead} ${sheet.noPrint}`}>
        <BrandMark className={styles.brandMark} title="Ubunifu Technologies" />
        <span className={styles.brandText}>Ubunifu Technologies</span>
      </div>
      {!link ? (
        <Notice title="This link has run out">
          This link has run out or was replaced by a newer one. Ask whoever sent it to you for a new
          link{orCall(org)}.
        </Notice>
      ) : link.thing === 'SignatureRequest' ? (
        <SignThroughLink
          link={link}
          token={token}
          org={org}
          now={now}
          signed={isSignedCopy(signed) ? signed : null}
        />
      ) : (
        <ReviewThroughLink link={link} token={token} org={org} />
      )}
      <p className={`${styles.note} ${styles.after} ${sheet.noPrint}`}>
        Questions? Email {org.email}
        {org.phone ? ` or call ${org.phone}` : ''}.
      </p>
    </main>
  );
}

/**
 * The page when there is nothing to open. It carries its own heading, since
 * there is no document or round here to give the page one.
 */
function Notice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={sheet.noPrint}>
      <div className={styles.pageHead}>
        <h1 className={styles.heading}>{title}</h1>
      </div>
      <p className={styles.notice} role="status">
        {children}
      </p>
    </div>
  );
}

/** The phone clause for a notice that sends someone back for a new link. */
function orCall(org: Awaited<ReturnType<typeof getOrg>>) {
  return org.phone ? `, or call us on ${org.phone}` : '';
}

async function SignThroughLink({
  link,
  token,
  org,
  now,
  signed,
}: {
  link: SharedLink;
  token: string;
  org: Awaited<ReturnType<typeof getOrg>>;
  now: Date;
  /** How their copy went, when signing has just sent them back here. */
  signed: SignedCopy | null;
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
      respondedAt: true,
      responseNote: true,
      respondedBy: { select: { name: true } },
      documentHash: true,
      version: { select: { bodyMarkdown: true, version: true } },
      termsVersion: { select: { version: true, title: true, bodyMarkdown: true } },
      signatures: { select: { signerName: true, initials: true, signedAt: true } },
      document: {
        select: {
          title: true,
          kind: true,
          reference: true,
          project: {
            select: { name: true, summary: true, client: { select: { name: true, legalName: true } } },
          },
        },
      },
    },
  });

  if (!request || request.status === 'cancelled') {
    return (
      <Notice title="Nothing to sign here">
        This version was withdrawn, so there is nothing to sign here. Ask whoever sent it to you for
        a new link{orCall(org)}.
      </Notice>
    );
  }

  const signature = request.signatures[0] ?? null;
  const expired = request.expiresAt !== null && request.expiresAt.getTime() < now.getTime();
  const declined = request.status === 'declined';
  const canSign = !signature && !expired && !declined;
  // Made for the main contact, who has since handed the role on: they can
  // still read it and ask for changes, as a colleague can in the portal, but
  // the new main contact signs (decision 6).
  const signs = link.contact.isPrimary;
  const main = signs ? null : await mainContactOf(link.contact.clientId);

  return (
    <>
      <HideAddressWhilePrinting />
      {canSign && <Opened token={token} />}
      <div className={sheet.toolbar}>
        {signature ? (
          <span className={`${forms.badge} ${forms.badgeGood}`}>
            Signed {formatDate(signature.signedAt)}
          </span>
        ) : signs ? (
          <span className={`${forms.badge} ${forms.badgeLive}`}>
            For {link.contact.name} to read and sign
          </span>
        ) : (
          <span className={`${forms.badge} ${forms.badgeLive}`}>
            With {main?.name ?? 'your main contact'} to sign
          </span>
        )}
        <PrintButton />
      </div>

      {expired && !signature && !declined && (
        <div className={`${styles.notice} ${sheet.noPrint}`} role="status">
          <p>The time to sign this ran out.</p>
          <AskAgain requestId={request.id} ask={askAgainWithLink} hidden={{ token }} />
        </div>
      )}
      {declined && !signature && (
        <p className={`${styles.notice} ${sheet.noPrint}`} role="status">
          This version was declined, so it is closed. Nothing was signed.
        </p>
      )}
      {request.respondedAt && !declined && !signature && (
        <div className={`${styles.notice} ${sheet.noPrint}`} role="status">
          <p>
            {request.respondedBy?.name ?? 'You'} asked for changes on{' '}
            {formatDate(request.respondedAt)}. We are working on a new version.
          </p>
          {request.responseNote && <p>{request.responseNote}</p>}
        </div>
      )}

      {signature && signed && (
        <div className={`${styles.notice} ${sheet.noPrint}`} role="status">
          <p>{signedNotice(signed, 'shared_link')}</p>
        </div>
      )}

      <ContractSheet
        org={org}
        kind={DOCUMENT_KIND_LABEL[request.document.kind]}
        title={request.document.title}
        reference={request.document.reference}
        client={request.document.project.client}
        projectName={request.document.project.name}
        summary={request.document.project.summary}
        sentAt={request.sentAt}
        bodyMarkdown={request.version.bodyMarkdown}
        terms={request.termsVersion}
        signature={signature}
        state={sheetStateOf(request)}
        proof={{
          version: request.version.version,
          fingerprint: shortHash(request.documentHash),
          termsVersion: request.termsVersion?.version ?? null,
        }}
      />

      {canSign && (
        <div className={`${sheet.toolbar} ${sheet.noPrint} ${styles.signArea}`}>
          {signs ? (
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
                wrongHint={
                  request.respondedAt
                    ? 'If anything is still wrong, do not sign it. We are working on a new version.'
                    : undefined
                }
              />
            </section>
          ) : (
            <section className={forms.card}>
              <div className={forms.cardHeader}>
                <h2 className={forms.cardTitle}>
                  With {main?.name ?? 'your main contact'} to sign
                </h2>
              </div>
              <p className={styles.note}>
                {main
                  ? `${main.name} signs for ${link.contact.clientName} as your main contact.`
                  : `Your main contact signs for ${link.contact.clientName}.`}
                {request.respondedAt
                  ? ''
                  : ' If something should change first, you can ask for changes below.'}
              </p>
            </section>
          )}
          {!request.respondedAt && (
            <section className={forms.card}>
              <div className={forms.cardHeader}>
                <h2 className={forms.cardTitle}>
                  {signs ? 'Not ready to sign?' : 'Something to change?'}
                </h2>
                <span className={forms.cardMeta}>
                  {signs ? 'Neither of these signs anything' : 'This does not sign anything'}
                </span>
              </div>
              <RespondForm
                requestId={request.id}
                body={request.version.bodyMarkdown}
                respond={respondWithLink}
                hidden={{ token }}
                wording={false}
                decline={signs}
              />
            </section>
          )}
        </div>
      )}
    </>
  );
}

async function ReviewThroughLink({
  link,
  token,
  org,
}: {
  link: SharedLink;
  token: string;
  org: Awaited<ReturnType<typeof getOrg>>;
}) {
  const review = await db.projectReview.findFirst({
    where: { id: link.thingId, project: { clientId: link.contact.clientId, deletedAt: null } },
    select: {
      id: true,
      projectId: true,
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

  if (!review) {
    return (
      <Notice title="This round is no longer open">
        There is nothing to answer here now. Ask whoever sent it to you for a new link
        {orCall(org)}.
      </Notice>
    );
  }

  // Withdrawn either because a newer round replaced it, or because the work
  // was paused or moved on and the round was taken back with nothing after
  // it. Neither promises that a new link is on its way.
  if (review.status === 'withdrawn') {
    const later = await db.projectReview.findFirst({
      where: {
        projectId: review.projectId,
        round: { gt: review.round },
        status: { not: 'withdrawn' },
      },
      select: { id: true },
    });
    return later ? (
      <Notice title="This round was replaced">
        This round was replaced by a newer version. Ask whoever sent it to you for a new link
        {orCall(org)}.
      </Notice>
    ) : (
      <Notice title="This round was taken back">
        We took this round back, so there is nothing to answer here for now.
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
      <ReviewRound review={review} audience="client" headingLevel="h2">
        {review.status === 'open' && (
          <ReviewAnswer reviewId={review.id} answer={answerWithLink} hidden={{ token }} />
        )}
      </ReviewRound>
    </section>
  );
}
