'use client';

import { useEffect } from 'react';

/**
 * Takes the link's token out of the address bar while the page prints, and
 * puts it back after. Browsers print the address in the page margins, and
 * whoever is handed the PDF could otherwise open the link and sign as the
 * person it was made for. Covers Ctrl+P and the Print button alike. Nothing
 * on the page reads the token from the address: the forms carry it in hidden
 * fields and Opened takes it as a prop.
 */
export function HideAddressWhilePrinting() {
  useEffect(() => {
    const original = window.location.href;
    const hide = () => window.history.replaceState(window.history.state, '', '/portal');
    const restore = () => window.history.replaceState(window.history.state, '', original);
    window.addEventListener('beforeprint', hide);
    window.addEventListener('afterprint', restore);
    return () => {
      window.removeEventListener('beforeprint', hide);
      window.removeEventListener('afterprint', restore);
    };
  }, []);
  return null;
}
