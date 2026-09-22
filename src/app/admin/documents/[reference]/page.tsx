import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requireStaff } from '@/lib/console/auth';
import { activityFor } from '@/lib/console/activity';
import {
  DOCUMENT_KIND_LABEL,
  DOCUMENT_STATUS_LABEL,
  renderMarkdown,
  shortHash,
} from '@/lib/console/documents';
import { formatDate, formatRelative, formatShortDate } from '@/lib/console/money';
import { ActivityFeed } from '@/components/console/ActivityFeed';
import {
  Copilot,
  SendForSignature,
  VersionEditor,
  type CopilotTurn,
} from '../DocumentEditor';
import styles from '../../Admin.module.css';
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

export async function generateMetadata({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  return { title: decodeURIComponent(reference) };
}

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  await requireStaff();
  const { reference } = await params;
  const now = new Date();

  const document = await db.document.findUnique({
    where: { reference: decodeURIComponent(reference) },
    select: {
      id: true,
      reference: true,
      title: true,
      kind: true,
      status: true,
      createdAt: true,
      project: {
        select: {
          name: true,
          slug: true,
          reference: true,
          client: { select: { name: true, slug: true } },
        },
      },
      versions: {
        orderBy: { version: 'desc' },
        select: {
          id: true,
          version: true,
          bodyMarkdown: true,
          changeNote: true,
          aiAssisted: true,
          aiModel: true,
          aiPromptSummary: true,
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
          expiresAt: true,
          respondedAt: true,
          responseNote: true,
          respondedBy: { select: { name: true, email: true } },
          version: { select: { version: true } },
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
              ip: true,
            },
          },
        },
      },
    },
  });

  if (!document) notFound();

  const activity = await activityFor([document.id]);

  // The drafting thread, if one has been started. Tool turns are folded into
  // the assistant turn they belong to, so the panel reads as a conversation
  // rather than as a transcript of the protocol.
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

  const latest = document.versions[0];
  const signed = document.status === 'signed';
  const live = document.signatureRequests.find((request) =>
    // 'declined' belongs here: a refused request is still the current one, and
    // dropping it would leave this page looking like nothing was ever sent.
    ['sent', 'viewed', 'signed', 'declined'].includes(request.status),
  );
  const signature = live?.signatures[0];
  const answered = live?.respondedAt ? live : null;

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <Link href={`/projects/${document.project.slug}`} className={styles.backLink}>
            ← {document.project.reference}
          </Link>
          <h1 className={styles.heading}>{document.title}</h1>
          <p className={styles.facts}>
            <span>
              <span className={styles.factLabel}>Kind</span> {DOCUMENT_KIND_LABEL[document.kind]}
            </span>
            <span>
              <span className={styles.factLabel}>Reference</span> {document.reference}
            </span>
            <span>
              <span className={styles.factLabel}>Client</span>{' '}
              <Link href={`/clients/${document.project.client.slug}`}>
                {document.project.client.name}
              </Link>
            </span>
            <span>
              <span className={styles.factLabel}>Versions</span> {document.versions.length}
            </span>
          </p>
        </div>
        <span className={`${forms.badge} ${STATUS_BADGE[document.status]}`}>
          {DOCUMENT_STATUS_LABEL[document.status]}
        </span>
      </div>

      {answered && (
        <section className={forms.card}>
          <div className={forms.cardHeader}>
            <h2 className={forms.cardTitle}>
              {answered.status === 'declined'
                ? 'The client declined this'
                : 'The client asked for changes'}
            </h2>
            <span className={forms.cardMeta}>
              Version {answered.version.version} · {formatShortDate(answered.respondedAt)}
            </span>
          </div>
          <p className={styles.note}>
            {answered.respondedBy
              ? `${answered.respondedBy.name} (${answered.respondedBy.email}) wrote:`
              : 'They wrote:'}
          </p>
          <blockquote className={forms.quote}>{answered.responseNote}</blockquote>
          <p className={forms.hint}>
            {answered.status === 'declined'
              ? 'This request is closed. Write the next version below and send it as a new one.'
              : 'This request is still open, so they can still sign this version. Write the next version below if the change is agreed.'}
          </p>
        </section>
      )}

      {signature && (
        <div className={styles.stats}>
          <div className={styles.stat}>
            <p className={styles.statLabel}>Signed by</p>
            <p className={styles.statValue}>{signature.initials}</p>
            <p className={styles.statHint}>
              {signature.signerName} · {signature.signerEmail}
            </p>
          </div>
          <div className={styles.stat}>
            <p className={styles.statLabel}>When</p>
            <p className={styles.statValue}>{formatShortDate(signature.signedAt)}</p>
            <p className={styles.statHint}>Version {live?.version.version}</p>
          </div>
          <div className={styles.stat}>
            <p className={styles.statLabel}>Terms accepted</p>
            <p className={styles.statValue}>
              {live?.termsVersion ? `v${live.termsVersion.version}` : '—'}
            </p>
            <p className={styles.statHint}>
              {signature.termsAcceptedAt ? formatShortDate(signature.termsAcceptedAt) : 'not pinned'}
            </p>
          </div>
          <div className={styles.stat}>
            <p className={styles.statLabel}>Fingerprint matched</p>
            <p className={styles.statValue}>
              {signature.documentHash === live?.documentHash ? 'Yes' : 'NO'}
            </p>
            <p className={styles.statHint}>
              <span className={forms.fingerprint}>{shortHash(signature.documentHash)}</span>
            </p>
          </div>
        </div>
      )}

      <div className={styles.columns}>
        <div className={styles.stack}>
          <section className={forms.card}>
            <div className={forms.cardHeader}>
              <h2 className={forms.cardTitle}>How it reads</h2>
              <span className={forms.cardMeta}>
                Version {latest?.version ?? 0} — exactly what the client sees
              </span>
            </div>
            {latest && latest.bodyMarkdown.trim() ? (
              <div
                className={forms.prose}
                // The renderer escapes everything first and reintroduces only
                // headings, paragraphs, lists and emphasis. There is no path
                // from a document body to a script tag or a link.
                dangerouslySetInnerHTML={{ __html: renderMarkdown(latest.bodyMarkdown) }}
              />
            ) : (
              <p className={styles.note}>
                Nothing written yet. Ask the assistant for a draft, or write it below.
              </p>
            )}
          </section>

          {!signed && (
            <section className={forms.card}>
              <div className={forms.cardHeader}>
                <h2 className={forms.cardTitle}>Write it</h2>
                <span className={forms.cardMeta}>Saved as a new version each time</span>
              </div>
              <VersionEditor
                documentId={document.id}
                body={latest?.bodyMarkdown ?? ''}
                locked={signed}
              />
            </section>
          )}

          <div className={table.frame}>
            <div className={table.toolbar}>
              <div className={table.toolbarText}>
                <h2 className={table.title}>Every version</h2>
                <span className={table.count}>Nothing here is ever edited or removed</span>
              </div>
            </div>
            <div className={table.scroll}>
              <table className={`${table.table} ${table.compact}`}>
                <thead>
                  <tr>
                    <th className={`${table.th} ${table.numericHead}`} scope="col">v</th>
                    <th className={table.th} scope="col">What changed</th>
                    <th className={table.th} scope="col">By</th>
                    <th className={table.th} scope="col">When</th>
                  </tr>
                </thead>
                <tbody>
                  {document.versions.map((version) => (
                    <tr key={version.id} className={table.tr}>
                      <td className={`${table.td} ${table.numeric}`}>{version.version}</td>
                      <td className={`${table.td} ${table.primary}`}>
                        {version.changeNote ?? <span className={table.muted}>—</span>}
                        {version.aiAssisted && (
                          <span className={table.sub}>
                            Drafted with {version.aiModel}
                            {version.aiPromptSummary ? ` · “${version.aiPromptSummary}”` : ''}
                          </span>
                        )}
                      </td>
                      <td className={`${table.td} ${table.nowrap}`}>
                        {version.createdBy?.name ?? <span className={table.muted}>—</span>}
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
        </div>

        <div className={styles.stack}>
          {!signed && (
            <>
              <section className={forms.card}>
                <div className={forms.cardHeader}>
                  <h2 className={forms.cardTitle}>Drafting</h2>
                  <span className={forms.cardMeta}>
                    {turns.length === 0
                      ? 'A co-pilot, not an author'
                      : `${turns.length} ${turns.length === 1 ? 'message' : 'messages'} so far`}
                  </span>
                </div>
                <Copilot documentId={document.id} turns={turns} />
              </section>

              <section className={forms.card}>
                <div className={forms.cardHeader}>
                  <h2 className={forms.cardTitle}>Send it</h2>
                  <span className={forms.cardMeta}>
                    {!live
                      ? 'Not sent yet'
                      : live.status === 'declined'
                        ? `Version ${live.version.version} was declined`
                        : live.status === 'signed'
                          ? `Version ${live.version.version} is signed`
                          : `Version ${live.version.version} is with them`}
                  </span>
                </div>
                {live && (
                  <div className={styles.rows}>
                    <div className={styles.row}>
                      <span className={styles.rowLabel}>Sent</span>
                      <span className={styles.rowValue}>{formatDate(live.sentAt)}</span>
                    </div>
                    <div className={styles.row}>
                      <span className={styles.rowLabel}>Opened</span>
                      <span className={styles.rowValue}>
                        {live.viewedAt ? formatDate(live.viewedAt) : 'not yet'}
                      </span>
                    </div>
                    <div className={styles.row}>
                      <span className={styles.rowLabel}>Fingerprint</span>
                      <span className={`${styles.rowValue} ${forms.fingerprint}`}>
                        {shortHash(live.documentHash)}
                      </span>
                    </div>
                  </div>
                )}
                <SendForSignature documentId={document.id} alreadySent={Boolean(live)} />
              </section>
            </>
          )}

          <section className={forms.card}>
            <div className={forms.cardHeader}>
              <h2 className={forms.cardTitle}>What has happened</h2>
            </div>
            <ActivityFeed items={activity} now={now} />
          </section>
        </div>
      </div>
    </main>
  );
}
