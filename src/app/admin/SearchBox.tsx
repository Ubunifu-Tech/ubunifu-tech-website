'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import { Search } from 'lucide-react';
import styles from './Admin.module.css';

/**
 * The search box in the top band. A plain GET form to /search, so it works
 * before any script has loaded and a search is a link to send someone.
 * ⌘K, Ctrl+K or / puts the cursor in it from anywhere that is not a field.
 */
export function SearchBox() {
  const input = useRef<HTMLInputElement>(null);
  const pathname = usePathname();
  const params = useSearchParams();
  const current = pathname === '/search' ? (params.get('q') ?? '') : '';

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '');
      const shortcut = (event.key === 'k' && (event.metaKey || event.ctrlKey)) || (event.key === '/' && !typing);
      if (!shortcut) return;
      event.preventDefault();
      input.current?.focus();
      input.current?.select();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <form action="/search" method="get" role="search" className={styles.search}>
      <Search size={16} strokeWidth={2} className={styles.searchIcon} aria-hidden="true" />
      <input
        ref={input}
        key={current}
        type="search"
        name="q"
        defaultValue={current}
        placeholder="Search"
        aria-label="Search clients, projects, invoices, payments and more"
        className={styles.searchInput}
        autoComplete="off"
      />
      <kbd className={styles.searchKey} aria-hidden="true">
        ⌘K
      </kbd>
    </form>
  );
}
