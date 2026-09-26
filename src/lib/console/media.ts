import 'server-only';
import { head } from '@vercel/blob';
import { db } from '@/lib/db';
import { recordAudit } from '@/lib/console/auth';
import { safeFilename, storedUnder, streamBlob } from '@/lib/console/uploads';
import { EXTENSION_FOR, MAX_MEDIA_BYTES } from './media-rules';

/**
 * Images for the public website.
 *
 * The journal used to take images only as paths into /public, which meant a
 * picture for a post had to be committed to the repository and deployed before
 * the post could use it. These are uploaded from the console instead, stored
 * privately, and served from our own domain at /media/<id>.<ext> — so a cover
 * in a WhatsApp preview reads ubunifutech.com, not a storage vendor's host, and
 * next/image treats it as a local image with nothing to configure.
 *
 * See the MediaAsset model for why this is a separate table from FileUpload.
 */

/**
 * Raster images only. SVG is excluded here even though client uploads accept
 * it: those are only ever downloaded, while these are rendered on our own
 * public origin for anybody, and an SVG is a document that can carry a script.
 */
export { EXTENSION_FOR, MAX_MEDIA_BYTES, MEDIA_CONTENT_TYPES } from './media-rules';

/**
 * The public address of an image. Also the exact shape the journal's cover
 * validation already accepts, so an uploaded cover needs no special case.
 */
export function mediaPath(asset: { id: string; extension: string }): string {
  return `/media/${asset.id}.${asset.extension}`;
}

/** Parses "/media/<id>.<ext>" or "<id>.<ext>". Anything else is not ours. */
export function parseMediaFile(file: string): { id: string; extension: string } | null {
  const match = /^(?:\/media\/)?([a-z0-9]{20,32})\.(jpg|png|webp|avif|gif)$/.exec(file);
  return match ? { id: match[1]!, extension: match[2]! } : null;
}

/**
 * Whether a /media/ address points at an image that was uploaded and is
 * still there. The address alone passes any pattern check, so a mistyped or
 * since-removed one would otherwise be saved and shown on the site broken.
 */
export async function uploadedImageExists(path: string): Promise<boolean> {
  const file = parseMediaFile(path);
  if (!file || !path.startsWith('/media/')) return false;
  const asset = await db.mediaAsset.findFirst({
    where: { id: file.id, extension: file.extension, deletedAt: null },
    select: { id: true },
  });
  return asset !== null;
}

/**
 * Writes the row for a finished upload, idempotent on the blob URL.
 *
 * Called by the console the moment the upload resolves and by the store's own
 * completion webhook, and whichever arrives second finds the row there. The
 * size and type come from the STORE, not from the browser that says it sent
 * them.
 */
export async function recordMediaAsset(input: {
  blobUrl: string;
  filename: string;
  staffId: string | null;
}): Promise<{ id: string; path: string; created: boolean }> {
  // Only an image uploaded for the website: a URL for a private file, such as
  // a client's or a bill, must never become a public image.
  if (!storedUnder(input.blobUrl, 'journal')) throw new Error('media-not-ours');

  const existing = await db.mediaAsset.findUnique({
    where: { storageKey: input.blobUrl },
    select: { id: true, extension: true },
  });
  if (existing) return { id: existing.id, path: mediaPath(existing), created: false };

  const meta = await head(input.blobUrl);
  const extension = EXTENSION_FOR[meta.contentType];
  if (!extension) throw new Error('media-wrong-type');
  if (meta.size > MAX_MEDIA_BYTES) throw new Error('media-too-large');

  let asset: { id: string; extension: string };
  try {
    asset = await db.mediaAsset.create({
      data: {
        storageKey: input.blobUrl,
        filename: safeFilename(input.filename).slice(0, 200),
        contentType: meta.contentType,
        extension,
        sizeBytes: meta.size,
        uploadedById: input.staffId,
      },
      select: { id: true, extension: true },
    });
  } catch (error) {
    // The other writer won the race. The unique key did its job.
    if ((error as { code?: string }).code === 'P2002') {
      const winner = await db.mediaAsset.findUnique({
        where: { storageKey: input.blobUrl },
        select: { id: true, extension: true },
      });
      if (winner) return { id: winner.id, path: mediaPath(winner), created: false };
    }
    throw error;
  }

  await recordAudit({
    actorType: input.staffId ? 'staff' : 'system',
    actorId: input.staffId,
    action: 'media.uploaded',
    entityType: 'MediaAsset',
    entityId: asset.id,
    summary: `${input.filename} added to the website's images`,
  });

  return { id: asset.id, path: mediaPath(asset), created: true };
}

/**
 * Serves one image to anybody. The whole decision is "does this image exist
 * and has it not been removed" — there is no session to check, which is
 * exactly why this can only ever read MediaAsset.
 *
 * The extension in the address must be the one the image was stored with, so
 * each image has one URL and one cache entry rather than five.
 */
export async function serveMedia(file: string): Promise<Response> {
  const parsed = parseMediaFile(file);
  if (!parsed) return new Response(null, { status: 404 });

  let asset: { storageKey: string; filename: string; extension: string } | null;
  try {
    asset = await db.mediaAsset.findFirst({
      where: { id: parsed.id, deletedAt: null },
      select: { storageKey: true, filename: true, extension: true },
    });
  } catch (error) {
    // The database being down must not become a 500 on a public page. A
    // missing image is a broken picture; the article around it still reads.
    console.error('[media] could not look up', parsed.id, error);
    return new Response(null, { status: 503, headers: { 'Retry-After': '60' } });
  }

  if (!asset || asset.extension !== parsed.extension) {
    return new Response(null, { status: 404 });
  }

  return streamBlob(asset.storageKey, { filename: asset.filename, cache: 'public' });
}
