'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import styles from './Admin.module.css';

/**
 * A thin line across the top from the moment a link inside the console is
 * pressed until the next page is on screen, so a click is answered at once
 * even while the page's records are still on their way.
 *
 * One listener for every link, rather than a change to each of them. It
 * leaves the server alone: the page still answers with a real redirect where
 * it redirects, which a loading boundary would turn into a client-side one.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [pending, setPending] = useState(false);

  // The address changing is the page arriving.
  const here = `${pathname}?${search}`;
  const [seen, setSeen] = useState(here);
  if (here !== seen) {
    setSeen(here);
    setPending(false);
  }

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.('a');
      if (!anchor || (anchor.target && anchor.target !== '_self') || anchor.hasAttribute('download')) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // The same page, or only a jump to a heading on it: nothing to wait for.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      setPending(true);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  // A page that never arrives, such as a download, must not leave it running.
  useEffect(() => {
    if (!pending) return;
    const stop = setTimeout(() => setPending(false), 15_000);
    return () => clearTimeout(stop);
  }, [pending]);

  return pending ? <div className={styles.progress} aria-hidden="true" /> : null;
}
