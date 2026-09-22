import 'server-only';
import { head, get } from '@vercel/blob';
import { db } from '@/lib/db';
import type { ActorType } from '@/generated/prisma/client';

/**
 * Files a client sends us, stored outside the database.
 *
 * The asset checklist on a project — the logo, the bio, the photographs — used
 * to end with "send these over however suits you, email or WhatsApp is fine".
 * That is a real answer, and it is also how a logo ends up in one person's
 * inbox and nowhere else. This is the other half of that checklist: the client
 * attaches the file to the thing we asked for, and it lands somewhere both
 * sides can see, against the request it answers.
 *
 * THE BYTES NEVER PASS THROUGH US. The browser uploads straight to the store
 * with a short-lived token this server issues after checking who is asking and
 * what they are allowed to attach it to, which is what makes a 40 MB folder of
 * photographs possible at all — a server action would cap out at around four.
 * What comes back is a URL, and we do not take the client's word for what is
 * behind it: head() asks the store for the real size and type before a row is
 * written.
 *
 * Blobs are PRIVATE. A client's brand assets, contracts and founder bio are
 * not public documents with an unguessable address; every read goes through a
 * route that checks the session first.
 *
 * Unconfigured is a state, not a crash. With no BLOB_READ_WRITE_TOKEN the
 * upload box is not shown and the old instruction stands, the same way the
 * mailer reports honestly rather than pretending a link was sent.
 */

export function uploadsConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/** 40 MB. Big enough for a folder of photographs, small enough to bound. */
export const MAX_UPLOAD_BYTES = 40 * 1024 * 1024;

/**
 * What a client can attach.
 *
 * An allowlist rather than a blocklist, and deliberately a short one: this is
 * the checklist for a website build, so it is images, documents and archives.
 * Nothing here is executable and nothing here is served back as HTML.
 */
export const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
  'image/svg+xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed',
];

export const ALLOWED_LABEL = 'Images, PDFs, Word and Excel files, text, CSV or a zip';

/** "2.4 MB". Sizes are read by people, so they are rounded like people write. */
export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  const mb = bytes / (1024 * 1024);
  // 40 MB, not 40.0 MB. A tenth only earns its place when there is one.
  return `${mb < 10 || mb % 1 >= 0.05 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

/**
 * Strips a filename down to something safe to put in a storage path.
 *
 * The original name is kept on the row and shown to people; this is only the
 * part that becomes a key, so it loses anything that could be read as a path.
 */
export function safeFilename(name: string): string {
  const cleaned = name
    .replace(/[\\/]/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+/, '')
    .slice(0, 120);
  return cleaned || 'file';
}

export type UploadActor = { type: ActorType; id: string | null };

/**
 * Writes the row for a finished upload.
 *
 * Idempotent on storageKey, which is what makes it safe for both writers: the
 * browser calls this the moment the upload resolves so the page can show it,
 * and in production the store's own completion webhook calls it too. Whichever
 * arrives second finds the row already there.
 */
export async function recordAssetUpload(input: {
  blobUrl: string;
  assetRequestId: string;
  actor: UploadActor;
  /** Name as the person's own computer had it, before the key was made safe. */
  filename: string;
}): Promise<{ id: string; created: boolean }> {
  const existing = await db.fileUpload.findUnique({
    where: { storageKey: input.blobUrl },
    select: { id: true },
  });
  if (existing) return { id: existing.id, created: false };

  // Not the client's numbers: the store's. A browser can claim any size and
  // any type it likes, and the only thing that knows the truth is the store.
  const meta = await head(input.blobUrl);

  if (meta.size > MAX_UPLOAD_BYTES) {
    throw new Error('upload-too-large');
  }

  const upload = await db.fileUpload.create({
    data: {
      storageKey: input.blobUrl,
      filename: input.filename.slice(0, 200),
      contentType: meta.contentType,
      sizeBytes: meta.size,
      uploadedByType: input.actor.type,
      uploadedById: input.actor.id,
      assetRequestId: input.assetRequestId,
    },
    select: { id: true },
  });

  // The checklist ticks itself off. Somebody can still set it back — 'received'
  // means something arrived, not that it was the right thing.
  await db.assetRequest.updateMany({
    where: { id: input.assetRequestId, status: 'requested' },
    data: { status: 'received', receivedAt: new Date() },
  });

  return { id: upload.id, created: true };
}

/**
 * Streams a stored file back, for a route that has already decided the reader
 * is allowed to have it. It takes no session and makes no decision of its own.
 */
export async function streamUpload(storageKey: string, filename: string): Promise<Response> {
  const pathname = new URL(storageKey).pathname.replace(/^\//, '');
  const result = await get(pathname, { access: 'private' });

  if (!result || result.statusCode !== 200) {
    return new Response(null, { status: 404 });
  }

  return new Response(result.stream, {
    headers: {
      'Content-Type': result.blob.contentType,
      // attachment, always. Nothing a client uploaded is ever rendered by the
      // browser on our origin — an SVG is a document with a script tag in it.
      'Content-Disposition': `attachment; filename="${safeFilename(filename)}"`,
      'Content-Length': String(result.blob.size),
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
