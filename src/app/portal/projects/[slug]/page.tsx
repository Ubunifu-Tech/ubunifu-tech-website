import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requireClient } from '@/lib/console/auth';
import { CLIENT_LABEL, STATUS_TONE } from '@/lib/console/project-status';
import { formatDate } from '@/lib/console/money';
import {
  ALLOWED_CONTENT_TYPES,
  ALLOWED_LABEL,
  MAX_UPLOAD_BYTES,
  fileSize,
  uploadsConfigured,
} from '@/lib/console/uploads';
import { UploadBox } from './UploadBox';
import styles from '../../Portal.module.css';
import forms from '@/styles/forms.module.css';

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

export default async function PortalProject({ params }: { params: Promise<{ slug: string }> }) {
  const actor = await requireClient();
  const { slug } = await params;

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

  const outstanding = project.assetRequests.filter(
    (request) => request.status !== 'received',
  ).length;
  // With no store configured the box is not shown at all, and the old
  // instruction stands on its own rather than sitting under a button that
  // would fail.
  const canUpload = uploadsConfigured();

  const total = project.phases.reduce((n, p) => n + p.deliverables.length, 0);
  const done = project.phases.reduce(
    (n, p) => n + p.deliverables.filter((d) => d.isComplete).length,
    0,
  );

  return (
    <main className={`${styles.page} ${styles.medium}`}>
      <div className={styles.pageHead}>
        <Link href="/portal" className={styles.projectMeta}>
          ← Your projects
        </Link>
        <h1 className={styles.heading}>{project.name}</h1>
        <p className={styles.lead}>
          {project.summary ??
            `${project.reference}${project.targetDate ? ` · aiming for ${formatDate(project.targetDate)}` : ''}`}
        </p>
        <p>
          <span className={`${forms.badge} ${TONE_CLASS[STATUS_TONE[project.status]]}`}>
            {CLIENT_LABEL[project.status]}
          </span>
        </p>
      </div>

      {project.assetRequests.length > 0 && (
        <section className={forms.card}>
          <div className={forms.cardHeader}>
            <h2 className={forms.cardTitle}>What we still need from you</h2>
            <span className={forms.cardMeta}>
              {outstanding} of {project.assetRequests.length} still to come
            </span>
          </div>
          <ul className={styles.needList}>
            {project.assetRequests.map((request) => (
              <li key={request.id} className={styles.needItem}>
                <span className={styles.needTitle}>{request.title}</span>
                {request.detail && <p className={styles.projectMeta}>{request.detail}</p>}

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

                {canUpload && (
                  <UploadBox
                    assetRequestId={request.id}
                    accept={ALLOWED_CONTENT_TYPES.join(',')}
                    maxBytes={MAX_UPLOAD_BYTES}
                    hint={`${ALLOWED_LABEL}, up to ${fileSize(MAX_UPLOAD_BYTES)}.`}
                  />
                )}
              </li>
            ))}
          </ul>
          <p className={styles.note}>
            {canUpload
              ? 'Attach them here and they land against the right item. Email or WhatsApp still works if that is easier.'
              : 'Send these over however suits you — email or WhatsApp is fine. We will tick them off here as they arrive.'}
          </p>
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
    </main>
  );
}
