import { NextResponse, type NextRequest } from 'next/server';

/**
 * Host routing and hardening. NOT authorisation.
 *
 * Middleware runs on the Edge runtime: no Postgres, no Node crypto, so it
 * cannot validate a session. Every access decision is made server-side in
 * src/lib/console/auth.ts. What this does is decide which app a host is allowed
 * to see, which is a routing question rather than a security check — and then
 * set the headers that hold regardless.
 *
 * Two rules:
 *
 *   admin host  → /admin/* only. The marketing site is not served there, so a
 *                 stray link cannot walk someone from the console into public
 *                 pages on a host that has the staff cookie.
 *   other hosts → everything except /admin/*, which 404s. Not 403: a wrong host
 *                 learns nothing about whether the console exists.
 *
 * The rewrite means the console is reached as admin.ubunifutech.com/projects
 * rather than /admin/projects, so no admin URL exists on the public origin at
 * all.
 */

const ADMIN_HOST = process.env.CONSOLE_ADMIN_HOST || 'admin.ubunifutech.com';

/** admin.localhost resolves to 127.0.0.1 without touching /etc/hosts. */
const DEV_ADMIN_HOSTS = ['admin.localhost', 'admin.127.0.0.1'];

function isAdminHost(hostHeader: string | null): boolean {
  if (!hostHeader) return false;
  const hostname = hostHeader.split(':')[0]!.toLowerCase();
  if (hostname === ADMIN_HOST.toLowerCase()) return true;
  if (process.env.NODE_ENV !== 'production') {
    return DEV_ADMIN_HOSTS.includes(hostname);
  }
  return false;
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

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const onAdminHost = isAdminHost(request.headers.get('host'));

  if (onAdminHost) {
    // Already rewritten, or an internal asset route: let it through.
    if (pathname.startsWith('/admin')) {
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
    return harden(NextResponse.rewrite(url), true);
  }

  // Public hosts: the console does not exist here.
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return harden(new NextResponse(null, { status: 404 }), false);
  }

  return harden(NextResponse.next(), false);
}

export const config = {
  /**
   * Everything except Next's own assets and the files served from /public.
   * Matching those would add a middleware invocation per image for no benefit.
   */
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$).*)',
  ],
};
