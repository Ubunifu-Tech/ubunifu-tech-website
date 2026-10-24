'use client';

import { useState } from 'react';
import Link from 'next/link';
import forms from '@/styles/forms.module.css';
import styles from './ClientPicker.module.css';

export type PickableClient = { name: string; slug: string; meta?: string };

/**
 * Choosing one client out of many: a search box over the list, each name a
 * link to the next page. `href` holds ":client" where the slug goes, so the
 * server decides where picking leads and nothing here has to be a callback.
 */
export function ClientPicker({
  clients,
  href,
  autoFocus = false,
}: {
  clients: PickableClient[];
  href: string;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const shown = needle ? clients.filter((client) => client.name.toLowerCase().includes(needle)) : clients;

  return (
    <div className={styles.picker}>
      <input
        type="search"
        className={forms.control}
        placeholder="Search clients"
        aria-label="Search clients"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        autoFocus={autoFocus}
        autoComplete="off"
      />
      {shown.length === 0 ? (
        <p className={styles.empty}>No client matches “{query.trim()}”.</p>
      ) : (
        <ul className={styles.list}>
          {shown.map((client) => (
            <li key={client.slug}>
              <Link href={href.replace(':client', encodeURIComponent(client.slug))} className={styles.item}>
                <span className={styles.name}>{client.name}</span>
                {client.meta && <span className={styles.meta}>{client.meta}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
