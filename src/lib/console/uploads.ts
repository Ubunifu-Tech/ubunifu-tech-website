import 'server-only';
import { head, get } from '@vercel/blob';
import { db } from '@/lib/db';
import { recordAudit } from '@/lib/console/auth';
import type { ActorType } from '@/generated/prisma/client';
import { alertClientSent } from './alerts';

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
  // Only a file stored under this very item: a URL for anything else in the
  // store, however it was learned, is refused before anything is read.
  if (!storedUnder(input.blobUrl, `requests/${input.assetRequestId}`)) {
    throw new Error('upload-not-ours');
  }

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

  const assetRequest = await db.assetRequest.findUnique({
    where: { id: input.assetRequestId },
    select: { title: true },
  });

  let upload: { id: string };
  try {
    upload = await db.fileUpload.create({
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
  } catch (error) {
    /*
     * The other writer got here between our read and our write — the browser
     * and the store's webhook finish at almost the same moment. The unique key
     * did its job; the file is recorded. This used to escape as a generic
     * failure, so a client whose file HAD arrived was told "that did not
     * arrive, try it again", and uploaded it twice.
     */
    if ((error as { code?: string }).code === 'P2002') {
      const winner = await db.fileUpload.findUnique({
        where: { storageKey: input.blobUrl },
        select: { id: true },
      });
      if (winner) return { id: winner.id, created: false };
    }
    throw error;
  }

  // The checklist ticks itself off. 'blocked' is included: a request is
  // usually blocked BECAUSE we are waiting on this very file, and leaving it
  // blocked once the file lands would hide the file from nobody but the
  // checklist. 'waived' is not — we said we no longer need it.
  await db.assetRequest.updateMany({
    where: { id: input.assetRequestId, status: { in: ['requested', 'blocked'] } },
    data: { status: 'received', receivedAt: new Date() },
  });

  // Audited here, by whichever writer created the row. It used to happen in
  // the browser's path only, so when the webhook won the race the upload
  // happened with no line in the audit trail at all.
  await recordAudit({
    actorType: input.actor.type,
    actorId: input.actor.id,
    action: 'asset.uploaded',
    entityType: 'AssetRequest',
    entityId: input.assetRequestId,
    summary: `${input.filename} sent${assetRequest ? ` for "${assetRequest.title}"` : ''}`,
  });

  // The file is safely recorded by now, so a failed alert must not reach the
  // client as a failed upload.
  if (input.actor.type === 'client_contact' && input.actor.id) {
    await alertClientSent({
      assetRequestId: input.assetRequestId,
      contactId: input.actor.id,
      answer: null,
      filename: input.filename,
    }).catch((error: unknown) => console.error('[uploads] team alert failed', error));
  }

  return { id: upload.id, created: true };
}

/**
 * Types a browser may RENDER rather than download.
 *
 * A receipt or a signed contract should open when you click it — being made to
 * download a PDF to read one line of it is a small indignity we control. So
 * this is an allowlist of things that are safe to put on screen, and the answer
 * for everything else is still "download it".
 *
 * image/svg+xml is deliberately NOT here, and neither is anything HTML-shaped.
 * An SVG is a document that can carry a script tag, and rendered inline on our
 * own origin that script would run with the reader's session. A client sending
 * their logo as an SVG is completely ordinary, so it is still accepted — it is
 * just never rendered, only downloaded.
 */
const INLINE_CONTENT_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
  'text/plain',
]);

/** The hosts a stored object may legitimately come from. */
const BLOB_HOST = /(^|\.)blob\.vercel-storage\.com$/;

/**
 * Whether a URL is an object in our own store, under the folder its upload
 * token was issued for. A finished upload is confirmed by the URL the browser
 * sends back, so without this a URL for somebody else's file, learned some
 * other way, could be recorded against the wrong thing and then read.
 */
export function storedUnder(url: string, folder: string): boolean {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;
    return (
      parsed.protocol === 'https:' &&
      BLOB_HOST.test(parsed.hostname) &&
      // Read as it is sent, which is how the file is fetched later. An
      // encoded slash, backslash or dot could name another folder once
      // decoded, and our own file names never contain one.
      !/%2f|%5c|%2e|\\/i.test(path) &&
      path.startsWith(`/${folder}/`)
    );
  } catch {
    return false;
  }
}

/**
 * Builds the Content-Disposition header.
 *
 * Two filenames: an ASCII-only one that every browser understands, and an
 * RFC 5987 one carrying the name the client actually gave the file, so
 * "Ripoti ya Mwaka.pdf" does not arrive as "Ripoti-ya-Mwaka.pdf". Both are
 * escaped — a filename is attacker-supplied text going into a response header,
 * and a raw quote or newline in one is header injection.
 */
function disposition(contentType: string, filename: string): string {
  const kind = INLINE_CONTENT_TYPES.has(contentType) ? 'inline' : 'attachment';
  const ascii = safeFilename(filename);
  const encoded = encodeURIComponent(filename).replace(/['()*]/g, (c) =>
    `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `${kind}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

/**
 * How a stored object is sent back. The two callers differ in exactly these:
 *
 *   private — a client's file. Never cached anywhere but the reader's own
 *             browser session, disposition decided by type.
 *   public  — a website image. Cached by every CDN for a year, because its
 *             address is its id and an id never gets different bytes: a
 *             replaced image is a new upload with a new address.
 */
export type StreamOptions = {
  filename: string;
  cache: 'private' | 'public';
};

/**
 * Streams a stored object back, for a route that has ALREADY decided the reader
 * may have it. It takes no session and makes no decision of its own.
 *
 * The object is fetched BY PATHNAME, not by the stored URL. The SDK rebuilds
 * the address from the store id, so even a storageKey that somehow pointed at
 * another host could not make this function fetch from it — the host is checked
 * as well, but the pathname is what makes the check redundant rather than
 * load-bearing.
 */
export async function streamBlob(storageKey: string, options: StreamOptions): Promise<Response> {
  let pathname: string;
  try {
    const parsed = new URL(storageKey);
    if (!BLOB_HOST.test(parsed.hostname)) return new Response(null, { status: 404 });
    pathname = parsed.pathname.replace(/^\//, '');
  } catch {
    // Not a URL at all. Nothing written by this module looks like this.
    return new Response(null, { status: 404 });
  }

  // A file that was uploaded while a store was configured outlives the
  // configuration. Saying so is better than a 500 that looks like the file is
  // corrupt when it is the deployment that is missing something.
  if (!uploadsConfigured()) {
    return new Response('File storage is not configured on this deployment.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  let result;
  try {
    result = await get(pathname, { access: 'private' });
  } catch (error) {
    // The store refused or is unreachable. The row is still correct, so this
    // is not a 404 — but the reader gets nothing either way.
    console.error('[uploads] could not read', pathname, error);
    return new Response(null, { status: 502 });
  }

  if (!result || result.statusCode !== 200) {
    return new Response(null, { status: 404 });
  }

  return new Response(result.stream, {
    headers: {
      'Content-Type': result.blob.contentType,
      'Content-Disposition': disposition(result.blob.contentType, options.filename),
      'Content-Length': String(result.blob.size),
      'Cache-Control':
        options.cache === 'public' ? 'public, max-age=31536000, immutable' : 'private, no-store',
      // nosniff stops a mislabelled file being re-read as HTML; the sandbox
      // CSP means that even if one ever were, it would run no script, load
      // nothing and reach no cookie. Inline rendering is why both are here.
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
    },
  });
}

/** A client's file: private caching, disposition by type. */
export function streamUpload(storageKey: string, filename: string): Promise<Response> {
  return streamBlob(storageKey, { filename, cache: 'private' });
}
