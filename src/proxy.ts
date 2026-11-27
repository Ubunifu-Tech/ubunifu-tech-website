import { NextResponse, type NextRequest } from 'next/server';
import { dynamicPrefixes, sitePages } from '@/content/site-pages';

/**
 * Host routing and hardening. NOT authorisation.
 *
 * Named `proxy` because Next 16 deprecated the `middleware` file convention.
 * Same execution model: the Edge runtime, with no Postgres and no Node crypto,
 * so it cannot validate a session. Every access decision is made server-side in
 * src/lib/console/auth.ts. What this does is decide which app a host is allowed
 * to see, which is a routing question rather than a security check — and then
 * set the headers that hold regardless.
 *
 * Three rules:
 *
 *   admin host  → /admin/* only. The marketing site is not served there, so a
 *                 stray link cannot walk someone from the console into public
 *                 pages on a host that has the staff cookie.
 *   portal host → /portal/* only, for the same reason with the client's
 *                 cookie. A link to a page of the website is sent on to the
 *                 website.
 *   other hosts → everything except /admin/* and /portal/*. A visit to either
 *                 is sent on to the same page on its own host, which is public
 *                 anyway and where people sign in; anything but a GET or HEAD
 *                 there still 404s, so a form post never follows it across.
 *
 * The rewrites mean the console is reached as admin.ubunifutech.com/projects
 * and the portal as portal.ubunifutech.com/invoices, so neither has an address
 * on the public origin at all. Every link in an email sent before the portal
 * moved still starts ubunifutech.com/portal, and the third rule is what keeps
 * those working.
 */

const ADMIN_HOST = process.env.CONSOLE_ADMIN_HOST || 'admin.ubunifutech.com';

/**
 * admin.localhost resolves to 127.0.0.1 without touching /etc/hosts. The same
 * list as isAdminHost in lib/console/env.ts, which the proxy cannot import.
 */
const DEV_ADMIN_HOSTS = ['admin.localhost'];

/**
 * The host the browser asked for.
 *
 * Usually the Host header. Not always: when a form's action ends in a
 * redirect, Next fetches the page it redirects to itself, so the browser gets
 * it in the same answer, and that request can arrive addressed to the server's
 * own origin with the browser's host only in x-forwarded-host. Read from Host
 * alone, a redirect to the portal's home was answered with the website's home
 * page. Vercel sets x-forwarded-host itself on every request, so a visitor
 * cannot choose it, and nothing here is an access check in any case.
 */
function askedHost(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('host');
}

function isAdminHost(hostHeader: string | null): boolean {
  if (!hostHeader) return false;
  const hostname = hostHeader.split(':')[0]!.toLowerCase();
  if (hostname === ADMIN_HOST.toLowerCase()) return true;
  if (process.env.NODE_ENV !== 'production') {
    return DEV_ADMIN_HOSTS.includes(hostname);
  }
  return false;
}

/**
 * The same console page on the admin host, for someone who typed the old
 * address on the public site. Built like consoleEnv.adminOrigin, which the
 * proxy cannot import. The path is set on the URL rather than parsed into it,
 * so /admin//elsewhere.example stays on the admin host.
 */
function onConsoleHost(pathname: string, search: string): URL | null {
  const scheme = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  let url: URL;
  try {
    url = new URL(process.env.CONSOLE_ADMIN_ORIGIN || `${scheme}://${ADMIN_HOST}`);
  } catch {
    return null;
  }
  url.pathname = pathname.slice('/admin'.length) || '/';
  url.search = search;
  return url;
}

const PORTAL_HOST = process.env.CONSOLE_PORTAL_HOST || 'portal.ubunifutech.com';

/** portal.localhost resolves to 127.0.0.1 too. */
const DEV_PORTAL_HOSTS = ['portal.localhost'];

function isPortalHost(hostHeader: string | null): boolean {
  if (!hostHeader) return false;
  const hostname = hostHeader.split(':')[0]!.toLowerCase();
  if (hostname === PORTAL_HOST.toLowerCase()) return true;
  if (process.env.NODE_ENV !== 'production') {
    return DEV_PORTAL_HOSTS.includes(hostname);
  }
  return false;
}

/** An origin from an environment variable, or null when it is not an address. */
function parsed(origin: string): URL | null {
  try {
    return new URL(origin);
  } catch {
    return null;
  }
}

/**
 * Where the portal lives, built like consoleEnv.portalOrigin, which the proxy
 * cannot import. On a laptop with nothing configured it is the same port on
 * portal.localhost, so the public site's Client login link works out of the box.
 */
function portalOrigin(request: NextRequest): URL | null {
  if (process.env.CONSOLE_PORTAL_ORIGIN) return parsed(process.env.CONSOLE_PORTAL_ORIGIN);
  const production = process.env.NODE_ENV === 'production';
  if (!production && request.nextUrl.hostname === 'localhost') {
    return parsed(`http://portal.localhost${request.nextUrl.port ? `:${request.nextUrl.port}` : ''}`);
  }
  return parsed(`${production ? 'https' : 'http'}://${PORTAL_HOST}`);
}

/** Where the website lives, for a link to one of its pages followed inside the portal. */
function publicOrigin(request: NextRequest): URL | null {
  if (process.env.CONSOLE_PUBLIC_ORIGIN) return parsed(process.env.CONSOLE_PUBLIC_ORIGIN);
  if (process.env.NODE_ENV !== 'production' && request.nextUrl.hostname === 'portal.localhost') {
    return parsed(`http://localhost${request.nextUrl.port ? `:${request.nextUrl.port}` : ''}`);
  }
  return parsed('https://ubunifutech.com');
}

/** The address with the path and query set on it, never parsed into it. */
function at(origin: URL | null, pathname: string, search: string): URL | null {
  if (!origin) return null;
  const url = new URL(origin);
  url.pathname = pathname;
  url.search = search;
  return url;
}

/** /portal/invoices as the browser is shown it: /invoices. */
function withoutPortal(pathname: string): string {
  return pathname.slice('/portal'.length) || '/';
}

const WEBSITE_PAGES = sitePages.map((page) => page.path).filter((path) => path !== '/' && path !== '/portal');
const WEBSITE_SECTIONS = dynamicPrefixes.filter((prefix) => prefix !== '/portal/');

/** A page of the public website, by its path: /build, /blog/an-article. */
function isWebsitePage(pathname: string): boolean {
  return WEBSITE_PAGES.includes(pathname) || WEBSITE_SECTIONS.some((prefix) => pathname.startsWith(prefix));
}

function harden(response: NextResponse, privateHost: boolean): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Frame-Options', 'DENY');

  if (privateHost) {
    // Nothing on the console or the portal should ever be indexed or embedded.
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  }
  return response;
}

/**
 * The portal page being asked for, in the app's own spelling, so that sending
 * somebody to sign in can bring them back to it. Only ever read as a
 * candidate: the server checks it is a portal path before using it.
 */
function withPortalPath(request: NextRequest, portalPathname: string, search: string): Headers {
  const headers = new Headers(request.headers);
  const query = new URLSearchParams(search);
  query.delete('_rsc');
  headers.set('x-portal-path', portalPathname + (query.size ? `?${query}` : ''));
  return headers;
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const host = askedHost(request);
  const onAdminHost = isAdminHost(host);

  if (onAdminHost) {
    // Already rewritten, or an internal asset route: let it through. The
    // app's own icons are generated at the root and are the same everywhere.
    if (pathname.startsWith('/admin') || /^\/(icon|apple-icon)(\/|$)/.test(pathname)) {
      return harden(NextResponse.next(), true);
    }

    // The console has no use for the marketing API. /api/contact stays on the
    // public host so a form post cannot arrive carrying a staff cookie.
    if (pathname.startsWith('/api/')) {
      return harden(
        new NextResponse(null, { status: 404 }),
        true,
      );
    }

    const url = request.nextUrl.clone();
    url.pathname = `/admin${pathname === '/' ? '' : pathname}`;
    url.search = search;
    // The console page being asked for, as the browser sees it, so that
    // sending somebody to sign in can bring them back to it. The same rule as
    // x-portal-path: only ever a candidate, checked on the server before use.
    const headers = new Headers(request.headers);
    const query = new URLSearchParams(search);
    query.delete('_rsc');
    headers.set('x-console-path', pathname + (query.size ? `?${query}` : ''));
    return harden(NextResponse.rewrite(url, { request: { headers } }), true);
  }

  const reading = request.method === 'GET' || request.method === 'HEAD';

  if (isPortalHost(host)) {
    if (/^\/(icon|apple-icon)(\/|$)/.test(pathname)) {
      return harden(NextResponse.next(), true);
    }

    // The portal's own endpoints (the help chat, file uploads) and nothing
    // else: /api/contact stays on the public host, as it does for the console.
    if (pathname.startsWith('/api/')) {
      return harden(
        pathname.startsWith('/api/portal/') ? NextResponse.next() : new NextResponse(null, { status: 404 }),
        true,
      );
    }

    // The app's own spelling, from a redirect on the server or a link written
    // before the portal moved: shown to the browser without the /portal. A
    // form post is let through as it is, since a redirect would lose its body.
    if (pathname === '/portal' || pathname.startsWith('/portal/')) {
      if (reading) {
        const clean = request.nextUrl.clone();
        clean.pathname = withoutPortal(pathname);
        return harden(NextResponse.redirect(clean, 307), true);
      }
      return harden(
        NextResponse.next({ request: { headers: withPortalPath(request, pathname, search) } }),
        true,
      );
    }

    // A page of the website, linked from the help chat or typed here.
    if (isWebsitePage(pathname)) {
      const there = reading ? at(publicOrigin(request), pathname, search) : null;
      // On a laptop the dev server addresses every request to localhost, and a
      // redirect to the address a request already has is sent as a bare path,
      // which the browser would follow back here for ever. There it is a 404.
      if (there && there.host !== request.nextUrl.host) return harden(NextResponse.redirect(there, 307), true);
      return harden(new NextResponse(null, { status: 404 }), true);
    }

    const url = request.nextUrl.clone();
    url.pathname = `/portal${pathname === '/' ? '' : pathname}`;
    url.search = search;
    return harden(
      NextResponse.rewrite(url, { request: { headers: withPortalPath(request, url.pathname, search) } }),
      true,
    );
  }

  // Public hosts: the console is not served here, but a visit is sent on to
  // it. Temporary, so browsers do not hold on to it if the host ever moves.
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    const there = reading ? onConsoleHost(pathname, search) : null;
    if (there) return harden(NextResponse.redirect(there, 307), false);
    return harden(new NextResponse(null, { status: 404 }), false);
  }

  // Nor is the portal. Every link in an email sent before it moved points
  // here, one-time sign-in links among them, so the page and its query string
  // go across untouched and the link is used up there, not here.
  if (pathname === '/portal' || pathname.startsWith('/portal/')) {
    const there = reading ? at(portalOrigin(request), withoutPortal(pathname), search) : null;
    if (there) return harden(NextResponse.redirect(there, 307), false);
    return harden(new NextResponse(null, { status: 404 }), false);
  }

  return harden(NextResponse.next(), false);
}

export const config = {
  /**
   * Everything except Next's own assets and the files served from /public.
   * Matching those would add an invocation per image for no benefit.
   */
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$).*)',
  ],
};
