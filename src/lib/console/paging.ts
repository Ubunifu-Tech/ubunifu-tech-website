/**
 * Pages for the console's lists. Each list shows a page at a time and says
 * which part of the whole it is, so everything stays reachable however long
 * the list grows, and a page is an address that can be shared.
 */

export const PAGE_SIZE = 50;

/** The page asked for in the address: the first one when it is missing or unreadable. */
export function pageNumber(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number(raw);
  return Number.isInteger(page) && page > 1 ? Math.min(page, 100_000) : 1;
}

/**
 * The rows to read for that page. A page past the end shows the last one,
 * so an old link to page 9 of a list that has since shrunk still shows rows.
 */
export function pageWindow(
  asked: number,
  total: number,
  size: number = PAGE_SIZE,
): { page: number; pages: number; skip: number; take: number } {
  const pages = Math.max(1, Math.ceil(total / size));
  const page = Math.min(asked, pages);
  return { page, pages, skip: (page - 1) * size, take: size };
}

/** The same address with only the page changed; the first page drops the parameter. */
export function pageHref(
  path: string,
  params: Record<string, string | undefined>,
  page: number,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && key !== 'page') search.set(key, value);
  }
  if (page > 1) search.set('page', String(page));
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}
