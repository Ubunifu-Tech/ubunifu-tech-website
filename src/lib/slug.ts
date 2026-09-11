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
