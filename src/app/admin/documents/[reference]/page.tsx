import type { ReactNode } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, CircleAlert } from 'lucide-react';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/console/auth';
import { activityFor } from '@/lib/console/activity';
import { liveDocument } from '@/lib/console/live';
import {
  DOCUMENT_KIND_LABEL,
  DOCUMENT_STATUS_LABEL,
  renderMarkdown,
  shortHash,
} from '@/lib/console/documents';
import { authorText, prepareDocument, type DocumentStep } from '@/lib/console/document-ready';
import { editableFees, feeSchedule, projectFees, projectFeesLater } from '@/lib/console/fees';
import { formatDate, formatRelative, formatShortDate } from '@/lib/console/money';
import { getOrg } from '@/lib/console/org';
import { ActivityFeed } from '@/components/console/ActivityFeed';
import { Callout } from '@/components/console/Callout';
import { FeeEditor } from '@/components/console/FeeEditor';
import { Steps } from '@/components/console/Steps';
import {
  Copilot,
  DetailsForm,
  SendForSignature,
  VersionEditor,
  WithdrawDocument,
  type CopilotTurn,
} from '../DocumentEditor';
import styles from '../../Admin.module.css';
import page from './Document.module.css';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';

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

const STEP_LABEL: Record<DocumentStep, string> = {
  details: 'Details',
  fees: 'Fees',
  write: 'Write',
  review: 'Review',
  send: 'Send',
};

export async function generateMetadata({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  return { title: decodeURIComponent(reference) };
}

export default async function DocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ reference: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  await requirePermission('documents');
  const [{ reference }, query] = await Promise.all([params, searchParams]);
  const now = new Date();

  const document = await db.document.findUnique({
    where: { reference: decodeURIComponent(reference), ...liveDocument },
    select: {
      id: true,
      reference: true,
      title: true,
      kind: true,
      status: true,
      createdAt: true,
      project: {
        select: {
          id: true,
          name: true,
          slug: true,
          reference: true,
          currency: true,
          client: { select: { id: true, name: true, slug: true } },
        },
      },
      versions: {
        orderBy: { version: 'desc' },
        select: {
          id: true,
          version: true,
          bodyMarkdown: true,
          sourceMarkdown: true,
          changeNote: true,
          aiAssisted: true,
          aiModel: true,
          createdAt: true,
          createdBy: { select: { name: true } },
        },
      },
      signatureRequests: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          documentHash: true,
          sentAt: true,
          viewedAt: true,
          respondedAt: true,
          responseNote: true,
          respondedBy: { select: { name: true, email: true } },
          version: { select: { version: true, bodyMarkdown: true } },
          termsVersion: { select: { version: true, title: true } },
          signatures: {
            select: {
              id: true,
              signerName: true,
              signerEmail: true,
              initials: true,
              signedAt: true,
              termsAcceptedAt: true,
              documentHash: true,
            },
          },
        },
      },
    },
  });

  if (!document) notFound();

  const latest = document.versions[0];
  const source = latest ? authorText(latest) : '';
  const signed = document.status === 'signed';
  const live = document.signatureRequests.find((request) =>
    // 'declined' belongs here: a refused request is still the current one, and
    // dropping it would leave this page looking like nothing was ever sent.
    ['sent', 'viewed', 'signed', 'declined'].includes(request.status),
  );
  const answered = live?.respondedAt ? live : null;

  const head = (
    <div className={styles.pageHead}>
      <div className={styles.headText}>
        <Link href={`/projects/${document.project.slug}?tab=documents`} className={styles.backLink}>
          ← {document.project.name}
        </Link>
        <h1 className={styles.heading}>{document.title}</h1>
        <p className={styles.lead}>
          {DOCUMENT_KIND_LABEL[document.kind]} · {document.reference} ·{' '}
          <Link href={`/clients/${document.project.client.slug}`} className={styles.inlineLink}>
            {document.project.client.name}
          </Link>
        </p>
      </div>
      <div className={styles.headActions}>
        <Link href={`/documents/${document.reference}/print`} className={`${forms.button} ${forms.quiet}`}>
          Print or save as PDF
        </Link>
        <span className={`${forms.badge} ${STATUS_BADGE[document.status]}`}>
          {DOCUMENT_STATUS_LABEL[document.status]}
        </span>
      </div>
    </div>
  );

  const activity = await activityFor([document.id]);

  const versions = (
    <div className={table.frame}>
      <div className={table.toolbar}>
        <div className={table.toolbarText}>
          <h2 className={table.title}>Versions</h2>
          <span className={table.count}>{document.versions.length}</span>
        </div>
      </div>
      <div className={table.scroll}>
        <table className={`${table.table} ${table.compact}`}>
          <thead>
            <tr>
              <th className={`${table.th} ${table.numericHead}`} scope="col">
                Version
              </th>
              <th className={table.th} scope="col">
                What changed
              </th>
              <th className={table.th} scope="col">
                By
              </th>
              <th className={table.th} scope="col">
                When
              </th>
            </tr>
          </thead>
          <tbody>
            {document.versions.map((version) => (
              <tr key={version.id} className={table.tr}>
                <td className={`${table.td} ${table.numeric}`}>{version.version}</td>
                <td className={`${table.td} ${table.primary}`}>
                  {version.changeNote ?? <span className={table.muted}>Edited</span>}
                  {version.aiAssisted && (
                    <span className={table.sub}>Drafted with the assistant</span>
                  )}
                </td>
                <td className={`${table.td} ${table.nowrap}`}>
                  {version.createdBy?.name ?? <span className={table.muted}>Unknown</span>}
                </td>
                <td className={`${table.td} ${table.nowrap}`}>
                  {formatShortDate(version.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const activityCard = (
    <section className={forms.card}>
      <div className={forms.cardHeader}>
        <h2 className={forms.cardTitle}>Activity</h2>
      </div>
      <ActivityFeed items={activity} now={now} />
    </section>
  );

  // ── Signed: a record, not a workspace ─────────────────────────────
  if (signed && live) {
    const signature = live.signatures[0];
    return (
      <main className={styles.page}>
        {head}
        {signature && (
          <div className={styles.summary}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Signed by</span>
              <span className={styles.summaryValue}>{signature.signerName}</span>
              <span className={styles.summaryLabel}>
                Initials {signature.initials} · {signature.signerEmail}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Signed on</span>
              <span className={styles.summaryValue}>{formatShortDate(signature.signedAt)}</span>
              <span className={styles.summaryLabel}>Version {live.version.version}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Terms</span>
              <span className={styles.summaryValue}>
                {live.termsVersion ? `Version ${live.termsVersion.version}` : 'None attached'}
              </span>
              <span className={styles.summaryLabel}>
                {signature.termsAcceptedAt
                  ? `Accepted ${formatShortDate(signature.termsAcceptedAt)}`
                  : ' '}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Unchanged since signing</span>
              <span className={styles.summaryValue}>
                {signature.documentHash === live.documentHash ? 'Yes' : 'No'}
              </span>
              <span className={`${styles.summaryLabel} ${forms.fingerprint}`}>
                {shortHash(signature.documentHash)}
              </span>
            </div>
          </div>
        )}

        <div className={page.split}>
          <div className={styles.stack}>
            <section className={forms.card}>
              <div className={forms.cardHeader}>
                <h2 className={forms.cardTitle}>What was signed</h2>
                <span className={forms.cardMeta}>Version {live.version.version}</span>
              </div>
              <div
                className={forms.prose}
                // The renderer escapes everything first and reintroduces only
                // headings, paragraphs, lists, tables and emphasis.
                dangerouslySetInnerHTML={{ __html: renderMarkdown(live.version.bodyMarkdown) }}
              />
            </section>
            {versions}
          </div>
          {activityCard}
        </div>
      </main>
    );
  }

  // ── A draft, or sent and waiting: the steps ─────────────────────
  const prepared = await prepareDocument({
    kind: document.kind,
    source,
    project: {
      id: document.project.id,
      currency: document.project.currency,
      clientId: document.project.client.id,
      clientSlug: document.project.client.slug,
    },
  });

  const order: DocumentStep[] = prepared.withFeeTable
    ? ['details', 'fees', 'write', 'review', 'send']
    : ['details', 'write', 'review', 'send'];

  const sentOrAnswered = Boolean(live);
  const fallback: DocumentStep = sentOrAnswered
    ? 'send'
    : source.trim().length > 0
      ? 'write'
      : prepared.withFeeTable
        ? 'fees'
        : 'write';
  const step: DocumentStep = order.includes(query.step as DocumentStep)
    ? (query.step as DocumentStep)
    : fallback;
  const index = order.indexOf(step);
  const hrefFor = (target: DocumentStep) => `/documents/${document.reference}?step=${target}`;

  const feeCheck = prepared.checks.find((check) => check.fix?.step === 'fees');
  const writeChecks = prepared.checks.filter((check) => check.fix?.step === 'write');
  const complete = order.map((key) => {
    if (key === 'details') return true;
    if (key === 'fees') return feeCheck?.ok ?? true;
    if (key === 'write') return writeChecks.every((check) => check.ok);
    if (key === 'review') return prepared.ready;
    return sentOrAnswered;
  });

  const previous = index > 0 ? order[index - 1] : null;
  const next = index < order.length - 1 ? order[index + 1] : null;

  const stepNav = (
    <div className={page.stepNav}>
      {previous ? (
        <Link href={hrefFor(previous)} className={`${forms.button} ${forms.quiet}`} scroll={false}>
          <ArrowLeft size={15} strokeWidth={1.8} aria-hidden="true" />
          {STEP_LABEL[previous]}
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link href={hrefFor(next)} className={forms.button} scroll={false}>
          Next: {STEP_LABEL[next]}
          <ArrowRight size={15} strokeWidth={1.8} aria-hidden="true" />
        </Link>
      )}
    </div>
  );

  let body: ReactNode = null;

  if (step === 'details') {
    body = (
      <section className={`${forms.card} ${page.narrowCard}`}>
        <div className={forms.cardHeader}>
          <h2 className={forms.cardTitle}>Details</h2>
        </div>
        <DetailsForm documentId={document.id} title={document.title} kind={document.kind} />
        <dl className={page.facts}>
          <div>
            <dt>Project</dt>
            <dd>
              <Link href={`/projects/${document.project.slug}`} className={styles.inlineLink}>
                {document.project.name}
              </Link>
            </dd>
          </div>
          <div>
            <dt>Who signs</dt>
            <dd>
              {prepared.signer ? (
                `${prepared.signer.name} (${prepared.signer.email ?? 'no email yet'})`
              ) : (
                <Link
                  href={`/clients/${document.project.client.slug}`}
                  className={styles.inlineLink}
                >
                  Add a main contact first
                </Link>
              )}
            </dd>
          </div>
        </dl>
        {stepNav}
      </section>
    );
  }

  if (step === 'fees') {
    const [fees, counted, later, org] = await Promise.all([
      editableFees(document.project.id),
      projectFees(document.project.id),
      projectFeesLater(document.project.id),
      getOrg(),
    ]);
    body = (
      <div className={page.column}>
        <section className={forms.card}>
          <div className={forms.cardHeader}>
            <h2 className={forms.cardTitle}>Fees</h2>
            <span className={forms.cardMeta}>Shared with the whole project</span>
          </div>
          {feeCheck && !feeCheck.ok && <Callout kind="warn">{feeCheck.problem}</Callout>}
          <FeeEditor
            projectId={document.project.id}
            currency={document.project.currency}
            fees={fees}
          />
        </section>

        <section className={forms.card}>
          <div className={forms.cardHeader}>
            <h2 className={forms.cardTitle}>How the fee table reads</h2>
          </div>
          <div
            className={`${forms.prose} ${page.feePreview}`}
            dangerouslySetInnerHTML={{
              __html: renderMarkdown(
                feeSchedule(
                  counted,
                  document.project.currency,
                  org.chargesVat ? org.vatRateBps : 0,
                  later,
                ),
              ),
            }}
          />
          <p className={forms.hint}>
            Put {'{{fees}}'} on its own line in the document to choose where this goes. Otherwise it
            goes at the end.
          </p>
          {stepNav}
        </section>
      </div>
    );
  }

  if (step === 'write') {
    // The drafting thread, if one has been started. Tool turns are folded into
    // the assistant turn they belong to, so it reads as a conversation.
    const conversation = await db.conversation.findFirst({
      where: { documentId: document.id, kind: 'document_draft' },
      orderBy: { createdAt: 'desc' },
      select: {
        messages: {
          where: { role: { in: ['user', 'assistant'] } },
          orderBy: { createdAt: 'asc' },
          select: { id: true, role: true, content: true, toolName: true, createdAt: true },
        },
      },
    });

    const turns: CopilotTurn[] = (conversation?.messages ?? [])
      .filter((message) => message.content.trim().length > 0 || message.toolName)
      .map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content.trim() || 'Wrote a new version.',
        toolName: message.toolName,
        when: formatRelative(message.createdAt, now),
      }));

    body = (
      <div className={page.split}>
        <section className={forms.card}>
          <div className={forms.cardHeader}>
            <h2 className={forms.cardTitle}>The document</h2>
            <span className={forms.cardMeta}>Version {latest?.version ?? 1}</span>
          </div>
          <VersionEditor
            // A new version from the assistant replaces what is in the editor.
            key={latest?.id}
            documentId={document.id}
            body={source}
            withFees={prepared.withFeeTable}
          />
        </section>

        <section className={forms.card}>
          <div className={forms.cardHeader}>
            <h2 className={forms.cardTitle}>Assistant</h2>
          </div>
          <Copilot documentId={document.id} turns={turns} />
        </section>
      </div>
    );
  }

  if (step === 'review') {
    body = (
      <div className={page.split}>
        <section className={forms.card}>
          <div className={forms.cardHeader}>
            <h2 className={forms.cardTitle}>What the client will read</h2>
          </div>
          {source.trim() ? (
            <div
              className={forms.prose}
              // The renderer escapes everything first and reintroduces only
              // headings, paragraphs, lists, tables and emphasis.
              dangerouslySetInnerHTML={{ __html: renderMarkdown(prepared.final) }}
            />
          ) : (
            <p className={styles.note}>Nothing written yet.</p>
          )}
        </section>

        <section className={`${forms.card} ${page.sticky}`}>
          <div className={forms.cardHeader}>
            <h2 className={forms.cardTitle}>Before it goes</h2>
          </div>
          <ul className={page.checks}>
            {prepared.checks.map((check) => (
              <li key={check.label} className={check.ok ? page.checkOk : page.checkBad}>
                <span className={page.checkIcon} aria-hidden="true">
                  {check.ok ? (
                    <Check size={14} strokeWidth={2.5} />
                  ) : (
                    <CircleAlert size={15} strokeWidth={2} />
                  )}
                </span>
                <span className={page.checkText}>
                  <span>{check.ok ? check.label : check.problem}</span>
                  {!check.ok && check.fix && (
                    <Link
                      href={check.fix.step ? hrefFor(check.fix.step) : (check.fix.href ?? '#')}
                      className={styles.inlineLink}
                    >
                      {check.fix.text}
                    </Link>
                  )}
                </span>
              </li>
            ))}
          </ul>
          {stepNav}
        </section>
      </div>
    );
  }

  if (step === 'send') {
    const open = live !== undefined && ['sent', 'viewed'].includes(live.status);
    // Fees live on the project and are written in at send time, so a fee
    // change makes no new version of the text. Comparing what would go now
    // with what they have catches that as well as an edit.
    const changedSince =
      open &&
      ((document.versions[0]?.version ?? 0) > live.version.version ||
        prepared.final !== live.version.bodyMarkdown);
    body = (
      <div className={page.split}>
        <div className={styles.stack}>
          <section className={forms.card}>
            <div className={forms.cardHeader}>
              <h2 className={forms.cardTitle}>Send for signature</h2>
              <span className={forms.cardMeta}>
                {!live
                  ? 'Not sent yet'
                  : live.status === 'declined'
                    ? `Version ${live.version.version} was declined`
                    : `Version ${live.version.version} is with them`}
              </span>
            </div>
            {live && (
              <dl className={page.facts}>
                <div>
                  <dt>Sent</dt>
                  <dd>{formatDate(live.sentAt)}</dd>
                </div>
                <div>
                  <dt>Opened</dt>
                  <dd>{live.viewedAt ? formatDate(live.viewedAt) : 'Not yet'}</dd>
                </div>
                <div>
                  <dt>Fingerprint</dt>
                  <dd className={forms.fingerprint}>{shortHash(live.documentHash)}</dd>
                </div>
              </dl>
            )}
            {!prepared.ready && (
              <Callout
                kind="warn"
                title="Not ready to send"
                action={
                  <Link href={hrefFor('review')} className={styles.inlineLink}>
                    See what is missing
                  </Link>
                }
              >
                {prepared.checks.find((check) => !check.ok)?.problem}
              </Callout>
            )}
            {changedSince && live && (
              <Callout kind="info" title={`This has changed since version ${live.version.version} went to them`}>
                Send the new version to replace the one they have.
              </Callout>
            )}
            {open && <WithdrawDocument documentId={document.id} />}
            {/* Once it is with them, sending again only makes sense when what
                would go now differs from what they have; otherwise the choice
                is to wait or withdraw. */}
            {(!open || changedSince) && (
              <SendForSignature
                documentId={document.id}
                alreadySent={Boolean(live)}
                ready={prepared.ready}
                signer={prepared.signer?.name ?? null}
              />
            )}
            {stepNav}
          </section>
          {versions}
        </div>
        {activityCard}
      </div>
    );
  }

  return (
    <main className={styles.page}>
      {head}

      {answered && (
        <Callout
          kind={answered.status === 'declined' ? 'bad' : 'warn'}
          title={
            answered.status === 'declined'
              ? `Declined on ${formatShortDate(answered.respondedAt)}`
              : `Changes asked for on ${formatShortDate(answered.respondedAt)}`
          }
        >
          {answered.respondedBy ? `${answered.respondedBy.name}: ` : ''}
          &ldquo;{answered.responseNote}&rdquo;
        </Callout>
      )}

      <div className={page.steps}>
        <Steps
          steps={order.map((key) => ({ key, label: STEP_LABEL[key] }))}
          current={index}
          hrefFor={(target) => hrefFor(order[target])}
          reachable={order.length - 1}
          complete={complete}
        />
      </div>

      {body}
    </main>
  );
}
