'use server';

import { revalidatePath } from 'next/cache';
import { can, requireStaff } from '@/lib/console/auth';
import { NO_PERMISSION } from '@/lib/console/permissions';
import { recordMediaAsset, removeMediaAsset } from '@/lib/console/media';
import { formText } from '@/lib/console/form';

export type RegisteredMedia = { ok: true; path: string } | { ok: false; message: string };

/**
 * Records an image the browser has just finished uploading, and returns the
 * address to put in the post.
 *
 * A server action is a public endpoint, so the staff check is here as well as
 * on the token route. What the browser sends is only a URL: the size and the
 * type are read back from the store itself before a row exists.
 */
export async function registerMedia(blobUrl: string, filename: string): Promise<RegisteredMedia> {
  const staff = await requireStaff();
  if (!can(staff, 'journal')) return { ok: false, message: NO_PERMISSION };

  try {
    const { path } = await recordMediaAsset({ blobUrl, filename, staffId: staff.id });
    return { ok: true, path };
  } catch (error) {
    const reason = error instanceof Error ? error.message : '';
    if (reason === 'media-wrong-type') {
      return { ok: false, message: 'That is not an image the site can show. Use JPG, PNG, WebP, AVIF or GIF.' };
    }
    if (reason === 'media-too-large') {
      return { ok: false, message: 'That image is larger than 20 MB.' };
    }
    console.error('[media] could not record', error);
    return { ok: false, message: 'That did not arrive. Try it again?' };
  }
}

export type RemoveMediaState = { status: 'idle' | 'done' | 'error'; message?: string };

/** Takes one image off the website, unless a post or a writer still uses it. */
export async function removeMedia(
  _previous: RemoveMediaState,
  formData: FormData,
): Promise<RemoveMediaState> {
  const staff = await requireStaff();
  if (!can(staff, 'journal')) return { status: 'error', message: NO_PERMISSION };

  const result = await removeMediaAsset(formText(formData, 'mediaId'), staff.id);
  if (!result.ok && 'usedIn' in result) {
    return { status: 'error', message: `Used in ${inList(result.usedIn)}. Take it out of those first.` };
  }
  if (!result.ok) {
    revalidatePath('/admin/posts/images');
    return { status: 'error', message: 'That image has already been removed.' };
  }

  revalidatePath('/admin/posts/images');
  return { status: 'done', message: 'Removed.' };
}

/** "Post: A", "Post: A and Writer: B", "Post: A, Post: B and Writer: C". */
function inList(items: string[]): string {
  return items.length < 2 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
}
