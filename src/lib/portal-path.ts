/**
 * The two spellings of a portal page.
 *
 * Inside the app every portal page lives under /portal: that is where its
 * files are, what the server redirects to, what a sign-in link remembers and
 * what the help chat is told to link. In the browser the portal has a host of
 * its own, so the same page is portal.ubunifutech.com/invoices, with no
 * /portal in front. The proxy turns one into the other on the way in; these
 * turn one into the other on the way out, wherever a link is drawn or the
 * browser's address is read.
 *
 * Pure and client-safe: no imports.
 */

/** What goes in a link: /portal/invoices?x#y becomes /invoices?x#y. */
export function portalHref(path: string): string {
  if (path === '/portal') return '/';
  if (path.startsWith('/portal/') || path.startsWith('/portal?') || path.startsWith('/portal#')) {
    const rest = path.slice('/portal'.length);
    return rest.startsWith('/') ? rest : `/${rest}`;
  }
  return path;
}

/** The app's own path for an address read from the browser: /invoices becomes /portal/invoices. */
export function portalPath(browserPath: string): string {
  if (browserPath === '/portal' || browserPath.startsWith('/portal/')) return browserPath;
  if (browserPath === '/' || browserPath === '') return '/portal';
  return `/portal${browserPath.startsWith('/') ? '' : '/'}${browserPath}`;
}
