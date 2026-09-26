import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requireClient } from '@/lib/console/auth';
import { mainContactOf } from '@/lib/console/contacts';
import { getOrg } from '@/lib/console/org';
import { clientStage } from '@/lib/console/project-status';
import { formatDate, formatMoney, formatShortDate } from '@/lib/console/money';
import { DOCUMENT_KIND_LABEL, portalDocumentState } from '@/lib/console/documents';
import { portalInvoiceState } from '@/lib/console/billing-labels';
import { liveInvoice, sentToClient } from '@/lib/console/live';
import {
  ALLOWED_CONTENT_TYPES,
  ALLOWED_LABEL,
  MAX_UPLOAD_BYTES,
  fileSize,
  uploadsConfigured,
} from '@/lib/console/uploads';
import { UploadBox } from './UploadBox';
import { AnswerBox } from './AnswerBox';
import { ItemOwner } from './ItemOwner';
import { BrandKitView } from '@/components/console/BrandKitView';
import { EarlierRounds, ReviewRound } from '@/components/console/ReviewRound';
import { ReviewAnswer } from './ReviewAnswer';
import styles from '../../Portal.module.css';
import forms from '@/styles/forms.module.css';

/** "A, B and C", starting with a capital. */
function sayList(parts: string[]): string {
  const text =
    parts.length <= 1 ? parts.join('') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const TONE_CLASS: Record<string, string> = {
  neutral: '',
  live: forms.badgeLive,
  good: forms.badgeGood,
  warn: forms.badgeWarn,
  bad: forms.badgeBad,
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const actor = await requireClient();
  const project = await db.project.findFirst({
    where: { slug, clientId: actor.clientId, deletedAt: null },
    select: { name: true },
  });
  return { title: project?.name ?? 'Project' };
}

export default async function PortalProject({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ answered?: string }>;
}) {
  const actor = await requireClient();
  const { slug } = await params;
  const { answered } = await searchParams;

  /**
   * Scoped by clientId in the query itself, not checked afterwards. A slug
   * belonging to another client simply does not match, so a guessed URL returns
   * "not found" rather than a permission error that confirms it exists.
   */
  const project = await db.project.findFirst({
    where: { slug, clientId: actor.clientId, deletedAt: null },
    select: {
      id: true,
      name: true,
      reference: true,
      status: true,
      summary: true,
      targetDate: true,
      launchedAt: true,
      owner: { select: { name: true, title: true } },
      client: {
        select: {
          contacts: {
            where: { deletedAt: null },
            orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
            select: { id: true, name: true },
          },
        },
      },
      phases: {
        orderBy: { position: 'asc' },
        select: {
          id: true,
          name: true,
          goal: true,
          // Internal engineering tasks are not the client's business.
          deliverables: {
            where: { isClientVisible: true },
            orderBy: { position: 'asc' },
            select: { id: true, title: true, isComplete: true },
          },
        },
      },
      // The team's own notes on the kit stay with the team.
      brandKit: {
        select: {
          typography: true,
          principles: true,
          imageryDirection: true,
          colors: { orderBy: { position: 'asc' }, select: { name: true, hex: true, usage: true } },
        },
      },
      // A round the team took back was never theirs to answer.
      reviews: {
        where: { status: { not: 'withdrawn' } },
        orderBy: { round: 'desc' },
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
        },
      },
      updates: {
        where: { status: 'published' },
        orderBy: { publishedAt: 'desc' },
        select: {
          id: true,
          title: true,
          bodyMarkdown: true,
          previewUrl: true,
          publishedAt: true,
        },
      },
      assetRequests: {
        // 'received' is in here now: a checklist that hides what you already
        // sent cannot tell you whether it arrived, which is the first thing
        // anybody wants to know after sending something.
        where: { status: { in: ['requested', 'blocked', 'received'] } },
        orderBy: { position: 'asc' },
        select: {
          id: true,
          title: true,
          detail: true,
          status: true,
          assigneeId: true,
          response: true,
          uploads: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'asc' },
            select: { id: true, filename: true, sizeBytes: true, createdAt: true },
          },
        },
      },
    },
  });

  if (!project) notFound();
  const now = new Date();

  // What has gone to them for this project: documents to read and sign, and
  // invoices, each as they would put it.
  const [documents, invoices] = await Promise.all([
    db.document.findMany({
      where: { projectId: project.id, signatureRequests: { some: { sentAt: { not: null } } } },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        reference: true,
        title: true,
        kind: true,
        status: true,
        signatureRequests: {
          where: { status: { in: ['sent', 'viewed', 'signed', 'declined'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            status: true,
            expiresAt: true,
            respondedAt: true,
            respondedBy: { select: { id: true, name: true } },
            signatures: { select: { signedAt: true } },
          },
        },
      },
    }),
    db.invoice.findMany({
      where: { projectId: project.id, clientId: actor.clientId, ...liveInvoice, ...sentToClient },
      orderBy: [{ issuedAt: 'desc' }, { createdAt: 'desc' }],
      select: { id: true, number: true, status: true, dueAt: true, totalMinor: true, paidMinor: true, currency: true },
    }),
  ]);
  const [main, org] = await Promise.all([mainContactOf(actor.clientId), getOrg()]);
  const viewer = { id: actor.id, signs: actor.isPrimary, signerName: main?.name ?? null };
  const papers = [
    ...documents.map((document) => ({
      key: document.id,
      href: `/portal/documents/${document.reference}`,
      title: document.title,
      detail: `${DOCUMENT_KIND_LABEL[document.kind]} · ${document.reference}`,
      state: portalDocumentState(document.status, document.signatureRequests[0], viewer, now),
      toPay: false,
    })),
    ...invoices.map((invoice) => {
      const state = portalInvoiceState(invoice, now);
      return {
        key: invoice.id,
        href: `/portal/invoices/${invoice.number}`,
        title: `Invoice ${invoice.number}`,
        detail: state.owing
          ? `${formatMoney(invoice.totalMinor - invoice.paidMinor, invoice.currency)} to pay${
              invoice.dueAt ? `, due ${formatShortDate(invoice.dueAt)}` : ''
            }`
          : formatMoney(invoice.totalMinor, invoice.currency),
        state: { ...state, waiting: false },
        toPay: state.owing,
      };
    }),
  ];
  // Only a document's state says "waiting" when it is theirs to sign.
  const toSign = papers.filter((paper) => paper.state.waiting).length;
  const toPay = papers.filter((paper) => paper.toPay).length;

  // Waiting means asked for and not sent, the same count as everywhere else.
  // An item marked not available is on hold: still to come, but not theirs to
  // act on now.
  const outstanding = project.assetRequests.filter(
    (request) => request.status === 'requested',
  ).length;
  const onHold = project.assetRequests.filter((request) => request.status === 'blocked').length;
  const [latestReview, ...earlierReviews] = project.reviews;
  const reviewOpen = latestReview?.status === 'open';
  const stage = clientStage(project.status, latestReview, { waiting: toSign > 0 });
  const waitingOnYou = [
    reviewOpen ? 'a review' : null,
    toSign > 0 ? (toSign === 1 ? 'a document to sign' : `${toSign} documents to sign`) : null,
    outstanding > 0 ? `${outstanding} ${outstanding === 1 ? 'item' : 'items'}` : null,
    toPay > 0 ? (toPay === 1 ? 'an invoice to pay' : `${toPay} invoices to pay`) : null,
  ].filter((part): part is string => part !== null);
  // With no store configured the box is not shown at all, and the old
  // instruction stands on its own rather than sitting under a button that
  // would fail.
  const canUpload = uploadsConfigured();

  const total = project.phases.reduce((n, p) => n + p.deliverables.length, 0);
  const done = project.phases.reduce(
    (n, p) => n + p.deliverables.filter((d) => d.isComplete).length,
    0,
  );

  // A launch date only counts once the project is actually live.
  const launched = ['launched', 'handover', 'closed'].includes(project.status)
    ? project.launchedAt
    : null;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  const people = [
    { value: '', label: 'Anyone on the team' },
    ...project.client.contacts.map((contact) => ({ value: contact.id, label: contact.name })),
  ];

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <Link href="/portal" className={styles.backLink}>
          ← Your projects
        </Link>
        <h1 className={styles.heading}>{project.name}</h1>
        {project.summary && <p className={styles.lead}>{project.summary}</p>}
      </div>

      <div className={styles.summary}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Stage</span>
          <span className={styles.summaryValue}>
            <span className={`${forms.badge} ${TONE_CLASS[stage.tone]}`}>{stage.label}</span>
          </span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Progress</span>
          <span className={styles.summaryValue}>
            {total === 0 ? 'Plan coming soon' : `${done} of ${total} done`}
          </span>
          <span className={styles.progressBar} aria-hidden="true">
            <span style={{ width: `${percent}%` }} />
          </span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Waiting on you</span>
          <span className={styles.summaryValue}>
            {waitingOnYou.length === 0 ? 'Nothing' : sayList(waitingOnYou)}
          </span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>{launched ? 'Launched' : 'Aiming for'}</span>
          <span className={styles.summaryValue}>
            {launched
              ? formatDate(launched)
              : project.targetDate
                ? formatDate(project.targetDate)
                : 'To be agreed'}
          </span>
        </div>
        {project.owner && (
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Your contact at Ubunifu</span>
            <span className={styles.summaryValue}>{project.owner.name}</span>
          </div>
        )}
      </div>

      <div
        className={
          project.assetRequests.length +
            project.updates.length +
            project.reviews.length +
            papers.length >
          0
            ? styles.layout
            : styles.stack
        }
      >
        <div className={styles.stack}>
          {reviewOpen && latestReview && (
            <section id="review" className={forms.card}>
              <div className={forms.cardHeader}>
                <h2 className={forms.cardTitle}>Ready for your review</h2>
              </div>
              <ReviewRound review={latestReview} audience="client">
                <ReviewAnswer reviewId={latestReview.id} />
              </ReviewRound>
              <EarlierRounds reviews={earlierReviews} audience="client" />
            </section>
          )}

          {project.assetRequests.length > 0 && (
            <section className={forms.card}>
              <div className={forms.cardHeader}>
                <h2 className={forms.cardTitle}>What we still need from you</h2>
                <span className={forms.cardMeta}>
                  {outstanding === 0 ? 'Nothing waiting on you' : `${outstanding} waiting on you`}
                  {onHold > 0 ? `, ${onHold} on hold` : ''}
                </span>
              </div>
              <ul className={styles.needList}>
                {project.assetRequests.map((request) => {
                  // Something that arrived as a file needs no empty answer
                  // box. Files can always be added, though: what we ask for is
                  // often a set of photographs, and the first one in is not
                  // the last.
                  const showAnswer = request.status !== 'received' || request.response !== null;
                  const showUpload = canUpload;
                  return (
                    <li key={request.id} className={styles.needItem}>
                      <span className={styles.itemStatus}>
                        <span className={styles.needTitle}>{request.title}</span>
                        <span
                          className={`${forms.badge} ${
                            request.status === 'received'
                              ? forms.badgeGood
                              : request.status === 'blocked'
                                ? forms.badgeBad
                                : forms.badgeWarn
                          }`}
                        >
                          {request.status === 'received'
                            ? 'Received'
                            : request.status === 'blocked'
                              ? 'On hold'
                              : 'Needed'}
                        </span>
                      </span>
                      {request.detail && <p className={styles.projectMeta}>{request.detail}</p>}

                      {showAnswer && (
                        <AnswerBox
                          assetRequestId={request.id}
                          response={request.response}
                          canAttach={showUpload}
                        />
                      )}

                      {request.uploads.length > 0 && (
                        <ul className={styles.fileList}>
                          {request.uploads.map((file) => (
                            <li key={file.id} className={styles.fileRow}>
                              <a href={`/portal/files/${file.id}`}>{file.filename}</a>
                              <span className={styles.fileMeta}>
                                {fileSize(file.sizeBytes)} · sent {formatDate(file.createdAt)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {request.status !== 'received' && people.length > 2 && (
                        <ItemOwner
                          id={request.id}
                          title={request.title}
                          assigneeId={request.assigneeId ?? ''}
                          people={people}
                        />
                      )}

                      {showUpload && (
                        <UploadBox
                          assetRequestId={request.id}
                          accept={ALLOWED_CONTENT_TYPES.join(',')}
                          maxBytes={MAX_UPLOAD_BYTES}
                          hint={`${ALLOWED_LABEL}, up to ${fileSize(MAX_UPLOAD_BYTES)} each. You can choose several at once.`}
                          email={org.email}
                          more={request.uploads.length > 0}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
              <p className={styles.note}>
                {canUpload
                  ? 'Write your answer or attach a file on each item. They land against the right one.'
                  : 'Write your answer on each item, or send files by email. We tick them off as they arrive.'}
              </p>
            </section>
          )}

          {papers.length > 0 && (
            <section className={forms.card}>
              <div className={forms.cardHeader}>
                <h2 className={forms.cardTitle}>Documents and invoices</h2>
                <span className={forms.cardMeta}>
                  {toSign + toPay === 0 ? 'Nothing waiting on you' : `${toSign + toPay} waiting on you`}
                </span>
              </div>
              <ul className={styles.paperList}>
                {papers.map((paper) => (
                  <li key={paper.key} className={styles.paperItem}>
                    <span className={styles.paperText}>
                      <Link href={paper.href} className={styles.paperTitle}>
                        {paper.title}
                      </Link>
                      <span className={styles.projectMeta}>{paper.detail}</span>
                    </span>
                    <span className={`${forms.badge} ${TONE_CLASS[paper.state.tone]}`}>
                      {paper.state.label}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {project.updates.length > 0 && (
            <section className={forms.card}>
              <div className={forms.cardHeader}>
                <h2 className={forms.cardTitle}>What we have told you</h2>
                <span className={forms.cardMeta}>
                  {project.updates.length} update{project.updates.length === 1 ? '' : 's'}
                </span>
              </div>
              <ul className={styles.updateList}>
                {project.updates.map((update) => (
                  <li key={update.id} className={styles.update}>
                    <h3 className={styles.updateTitle}>{update.title}</h3>
                    <p className={styles.projectMeta}>{formatDate(update.publishedAt)}</p>
                    {/* Rendered as plain text on purpose: the body is written by
                    staff in a textarea, and passing it through a Markdown
                    renderer would mean deciding what HTML a staff member may
                    put in front of a client. Paragraphs are enough. */}
                    <div className={styles.updateBody}>
                      {update.bodyMarkdown
                        .split(/\n{2,}/)
                        .map((block) => block.trim())
                        .filter(Boolean)
                        .map((block, index) => (
                          <p key={index}>{block}</p>
                        ))}
                    </div>
                    {update.previewUrl && (
                      <a
                        href={update.previewUrl}
                        className={forms.link}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        Take a look
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {!reviewOpen && latestReview && (
            <section id="review" className={forms.card}>
              <div className={forms.cardHeader}>
                <h2 className={forms.cardTitle}>Your reviews</h2>
              </div>
              {answered === 'review' && (
                <p className={styles.notice} role="status">
                  Thank you. We have your answer, and the next step is ours.
                </p>
              )}
              <ReviewRound review={latestReview} audience="client" />
              <EarlierRounds reviews={earlierReviews} audience="client" />
            </section>
          )}
        </div>

        <section className={forms.card}>
          <div className={forms.cardHeader}>
            <h2 className={forms.cardTitle}>Where the work has got to</h2>
            <span className={forms.cardMeta}>
              {done} of {total} done
            </span>
          </div>

          {project.phases.length === 0 ? (
            <p className={styles.note}>
              The plan for this project is still being put together. It will appear here.
            </p>
          ) : (
            project.phases.map((phase) => (
              <div key={phase.id} className={styles.stage}>
                <div className={styles.stageHead}>
                  <h3 className={styles.stageName}>{phase.name}</h3>
                  <span className={forms.cardMeta}>
                    {phase.deliverables.filter((d) => d.isComplete).length}/
                    {phase.deliverables.length}
                  </span>
                </div>
                {phase.goal && <p className={styles.projectMeta}>{phase.goal}</p>}
                <ul className={styles.stageList}>
                  {phase.deliverables.map((deliverable) => (
                    <li
                      key={deliverable.id}
                      className={deliverable.isComplete ? styles.stageDone : styles.stageOpen}
                    >
                      {deliverable.title}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </section>

        {project.brandKit &&
          (project.brandKit.colors.length > 0 ||
            project.brandKit.typography ||
            project.brandKit.principles ||
            project.brandKit.imageryDirection) && (
            <section className={`${forms.card} ${styles.layoutWide}`}>
              <div className={forms.cardHeader}>
                <h2 className={forms.cardTitle}>Your brand kit</h2>
              </div>
              <BrandKitView kit={{ ...project.brandKit, notes: null }} />
            </section>
          )}
      </div>
    </main>
  );
}
