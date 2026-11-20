import { NextResponse, type NextRequest } from 'next/server';

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
 * Two rules:
 *
 *   admin host  → /admin/* only. The marketing site is not served there, so a
 *                 stray link cannot walk someone from the console into public
 *                 pages on a host that has the staff cookie.
 *   other hosts → everything except /admin/*. A visit to /admin/* is sent on
 *                 to the same page on the admin host, which is public anyway
 *                 and where staff sign in; anything but a GET or HEAD there
 *                 still 404s, so a form post never follows it across.
 *
 * The rewrite means the console is reached as admin.ubunifutech.com/projects
 * rather than /admin/projects, so no admin URL exists on the public origin at
 * all.
 */

const ADMIN_HOST = process.env.CONSOLE_ADMIN_HOST || 'admin.ubunifutech.com';

/**
 * admin.localhost resolves to 127.0.0.1 without touching /etc/hosts. The same
 * list as isAdminHost in lib/console/env.ts, which the proxy cannot import.
 */
const DEV_ADMIN_HOSTS = ['admin.localhost'];

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

function harden(response: NextResponse, onAdminHost: boolean): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Frame-Options', 'DENY');

  if (onAdminHost) {
    // Nothing on the console should ever be indexed or embedded.
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  }
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const onAdminHost = isAdminHost(request.headers.get('host'));

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

  // Public hosts: the console is not served here, but a visit is sent on to
  // it. Temporary, so browsers do not hold on to it if the host ever moves.
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    const there = request.method === 'GET' || request.method === 'HEAD' ? onConsoleHost(pathname, search) : null;
    if (there) return harden(NextResponse.redirect(there, 307), false);
    return harden(new NextResponse(null, { status: 404 }), false);
  }

  // The portal page being asked for, so that sending somebody to sign in can
  // bring them back to it. Only ever read as a candidate: the server checks it
  // is a portal path before using it.
  if (pathname === '/portal' || pathname.startsWith('/portal/')) {
    const headers = new Headers(request.headers);
    headers.set('x-portal-path', `${pathname}${search}`);
    return harden(NextResponse.next({ request: { headers } }), false);
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
