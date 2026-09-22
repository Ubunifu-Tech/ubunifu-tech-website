/**
 * What the website's image upload accepts, readable from the browser.
 *
 * Separate from media.ts because that module is server-only and imports the
 * database; a client component importing a constant from it would pull the
 * Postgres driver into the browser bundle. The server checks all of this again
 * against what the store reports — these exist so a person gets told before
 * a twenty-megabyte upload rather than after.
 */

export const EXTENSION_FOR: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
};

export const MEDIA_CONTENT_TYPES = Object.keys(EXTENSION_FOR);

/** 20 MB. A photograph straight off a phone fits; next/image does the rest. */
export const MAX_MEDIA_BYTES = 20 * 1024 * 1024;
