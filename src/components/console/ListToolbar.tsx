import Link from 'next/link';
import { Search, X } from 'lucide-react';
import table from '@/styles/table.module.css';

export type ListView = { key: string; label: string; count: number };

/**
 * The top of a list: which slice you are looking at, with how many are in
 * each, and a search box. Plain links and a GET form, so it works before any
 * script has loaded and every view has its own address to share.
 */
export function ListToolbar({
  path,
  views,
  current,
  viewParam = 'show',
  defaultView,
  title,
  count,
  query,
  searchLabel,
  keep = {},
  actions,
}: {
  /** The list's own address, without the /admin prefix. */
  path: string;
  views?: ListView[];
  current?: string;
  viewParam?: string;
  /** The view shown when the address has none, linked without a parameter. */
  defaultView?: string;
  /** For a list with no views: its name, shown with the count. */
  title?: string;
  count?: number;
  query?: string;
  /** What can be searched for, as a placeholder: "Search by number or client". */
  searchLabel?: string;
  /** Other parameters a search should keep, such as the board or list layout. */
  keep?: Record<string, string | undefined>;
  actions?: React.ReactNode;
}) {
  const href = (view: string) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(keep)) if (value) params.set(key, value);
    if (view !== defaultView) params.set(viewParam, view);
    if (query) params.set('q', query);
    const search = params.toString();
    return search ? `${path}?${search}` : path;
  };

  const clearHref = (() => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(keep)) if (value) params.set(key, value);
    if (current && current !== defaultView) params.set(viewParam, current);
    const search = params.toString();
    return search ? `${path}?${search}` : path;
  })();

  return (
    <div className={table.toolbar}>
      {views ? (
        <nav className={table.views} aria-label="Views">
          {views.map((view) => (
            <Link
              key={view.key}
              href={href(view.key)}
              className={table.view}
              aria-current={view.key === current ? 'page' : undefined}
              scroll={false}
            >
              {view.label}
              <span className={table.viewCount}>{view.count}</span>
            </Link>
          ))}
        </nav>
      ) : (
        <div className={table.toolbarText}>
          {title && <h2 className={table.title}>{title}</h2>}
          {count !== undefined && <span className={table.count}>{count}</span>}
        </div>
      )}

      <div className={table.toolbarActions}>
        {searchLabel && (
          <form role="search" action={path} className={table.search}>
            {Object.entries(keep).map(([key, value]) =>
              value ? <input key={key} type="hidden" name={key} value={value} /> : null,
            )}
            {current && current !== defaultView && (
              <input type="hidden" name={viewParam} value={current} />
            )}
            <Search size={16} strokeWidth={2} className={table.searchIcon} aria-hidden="true" />
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder={searchLabel}
              aria-label={searchLabel}
              className={table.searchInput}
              maxLength={120}
              autoComplete="off"
            />
            {query && (
              <Link href={clearHref} className={table.searchClear} aria-label="Clear search" scroll={false}>
                <X size={14} strokeWidth={2} aria-hidden="true" />
              </Link>
            )}
          </form>
        )}
        {actions}
      </div>
    </div>
  );
}

/**
 * The line under a list: how much of it is on screen. Says so plainly when a
 * list was cut short, so a capped list is never mistaken for the whole of it.
 */
export function ListFooter({
  shown,
  total,
  noun,
  query,
}: {
  shown: number;
  total: number;
  /** Singular and plural: ['invoice', 'invoices']. */
  noun: [string, string];
  query?: string;
}) {
  if (total === 0) return null;
  const word = total === 1 ? noun[0] : noun[1];
  const text =
    shown < total
      ? `Showing ${shown} of ${total} ${word}. Search to find the rest.`
      : query
        ? `${total} ${word} match “${query}”`
        : `${total} ${word}`;
  return <div className={table.footer}>{text}</div>;
}

/** Trimmed search text from the address, or undefined when there is none. */
export function searchText(value: string | string[] | undefined): string | undefined {
  const text = (Array.isArray(value) ? value[0] : value)?.trim().slice(0, 120);
  return text ? text : undefined;
}
