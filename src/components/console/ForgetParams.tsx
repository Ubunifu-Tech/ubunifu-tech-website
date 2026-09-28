'use client';

import { useEffect } from 'react';

/**
 * Takes one-time notices out of the address bar once the page has shown them,
 * so a reload, a bookmark or a copied link does not say it again. Renders
 * nothing, and leaves the address alone when none of the names are in it.
 */
export function ForgetParams({ names }: { names: string[] }) {
  const key = names.join(',');
  useEffect(() => {
    const url = new URL(window.location.href);
    let changed = false;
    for (const name of key.split(',')) {
      if (url.searchParams.has(name)) {
        url.searchParams.delete(name);
        changed = true;
      }
    }
    if (changed) window.history.replaceState(window.history.state, '', url);
  }, [key]);
  return null;
}
