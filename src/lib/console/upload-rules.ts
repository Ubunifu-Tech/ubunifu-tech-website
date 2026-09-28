/**
 * What a client can attach to something we asked for, readable from the
 * browser.
 *
 * Separate from uploads.ts because that module is server-only and imports the
 * database; a client component importing a constant from it would pull the
 * Postgres driver into the browser bundle. The store refuses any other type
 * when the upload token is used, and the server reads the real size and type
 * back from the store. These exist so a person is told before an upload
 * rather than after.
 */

/** 40 MB. Big enough for a folder of photographs, small enough to bound. */
export const MAX_UPLOAD_BYTES = 40 * 1024 * 1024;

/**
 * What a client can attach.
 *
 * An allowlist rather than a blocklist, and deliberately a short one: this is
 * the checklist for a website build, so it is images, documents and archives.
 * Nothing here is executable and nothing here is served back as HTML. HEIC
 * and HEIF are how iPhones save photographs; browsers cannot show them, so
 * they download rather than open (uploads.ts INLINE_CONTENT_TYPES).
 */
export const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
  'image/svg+xml',
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
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

/**
 * The type for a file by its extension. Browsers report no type at all for
 * some files they do not know, such as a .heic photograph on most laptops or
 * a .webp on Windows, and those are still files we take.
 */
export const TYPE_FOR_EXTENSION: Readonly<Record<string, string>> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  heic: 'image/heic',
  heif: 'image/heif',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  txt: 'text/plain',
  csv: 'text/csv',
  zip: 'application/zip',
};

/**
 * The type a file is checked and stored as: what the browser says when that
 * is a type we take, otherwise what its extension says. The same value goes
 * to the store, which would otherwise guess from the name on its own.
 */
export function uploadTypeOf(file: { name: string; type: string }): string {
  if (ALLOWED_CONTENT_TYPES.includes(file.type)) return file.type;
  const dot = file.name.lastIndexOf('.');
  const extension = dot > 0 ? file.name.slice(dot + 1).toLowerCase() : '';
  return Object.hasOwn(TYPE_FOR_EXTENSION, extension) ? TYPE_FOR_EXTENSION[extension] : file.type;
}

/** For the file picker: the types, plus the extensions for files with none. */
export const UPLOAD_ACCEPT = [
  ...ALLOWED_CONTENT_TYPES,
  ...Object.keys(TYPE_FOR_EXTENSION).map((extension) => `.${extension}`),
].join(',');
