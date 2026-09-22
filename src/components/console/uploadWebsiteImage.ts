'use client';

import { upload } from '@vercel/blob/client';
import { registerMedia, type RegisteredMedia } from '@/app/admin/media/actions';
import { MAX_MEDIA_BYTES, MEDIA_CONTENT_TYPES } from '@/lib/console/media-rules';

/**
 * Uploads one image for the website and returns its address on our domain.
 *
 * The bytes go straight from this browser to the store, using a token the
 * console issues after checking the session, so a full-size photograph is
 * fine. When that finishes the server is told the URL and reads the size and
 * type back from the store itself before it records anything.
 *
 * Checked here first only so a person is told immediately rather than after a
 * twenty-megabyte upload; the server checks everything again.
 */
export async function uploadWebsiteImage(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<RegisteredMedia> {
  if (!MEDIA_CONTENT_TYPES.includes(file.type)) {
    return {
      ok: false,
      message: 'That is not an image the site can show — use JPG, PNG, WebP, AVIF or GIF.',
    };
  }
  if (file.size > MAX_MEDIA_BYTES) {
    return { ok: false, message: 'That image is larger than 20 MB.' };
  }

  try {
    const blob = await upload(`journal/${file.name}`, file, {
      access: 'private',
      // Rewritten by the console host to /admin/media/upload.
      handleUploadUrl: '/media/upload',
      multipart: file.size > 5 * 1024 * 1024,
      onUploadProgress: ({ percentage }) => onProgress?.(Math.round(percentage)),
    });
    return await registerMedia(blob.url, file.name);
  } catch (error) {
    console.error('[media] upload failed', error);
    return {
      ok: false,
      message:
        error instanceof Error && /not configured/i.test(error.message)
          ? 'Image storage is not set up on this deployment yet.'
          : 'That did not go through. Try it again?',
    };
  }
}
