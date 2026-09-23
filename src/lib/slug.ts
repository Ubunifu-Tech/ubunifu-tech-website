/** Stable anchor ids for case-study sections, linked from the /work contents list. */
export function sectionId(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    // portfolio.tsx uses curly apostrophes; drop them rather than turn them into hyphens.
    .replace(/[‘’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * A URL-safe form of a title for a record's address: lowercase words joined
 * by hyphens, accents dropped, at most 60 characters. Plain code with no
 * imports, so the console can show an address as it is typed and the server
 * checks the same rule.
 */
export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
