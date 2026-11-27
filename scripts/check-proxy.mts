/**
 * Which host serves what, as src/proxy.ts decides it, without a server.
 *
 * ubunifutech.com/admin used to answer with a blank 404, and staff typed it.
 * A visit there is now sent on to the same page on the console's own host. A
 * form post is not: it still 404s, so nothing is ever posted across hosts.
 *
 * Run with: npm run check:proxy
 */
process.env.CONSOLE_ADMIN_HOST = 'admin.ubunifutech.com';
delete process.env.CONSOLE_ADMIN_ORIGIN;
process.env.CONSOLE_PORTAL_HOST = 'portal.ubunifutech.com';
delete process.env.CONSOLE_PORTAL_ORIGIN;
delete process.env.CONSOLE_PUBLIC_ORIGIN;

const { NextRequest } = await import('next/server');
const { proxy } = await import('../src/proxy');

const failures: string[] = [];
const expect = (name: string, actual: unknown, wanted: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    failures.push(`${name}: got ${JSON.stringify(actual)}, wanted ${JSON.stringify(wanted)}`);
  }
};

const answer = (url: string, method = 'GET') => {
  const response = proxy(new NextRequest(url, { method, headers: { host: new URL(url).host } }));
  return {
    status: response.status,
    location: response.headers.get('location'),
    rewrite: response.headers.get('x-middleware-rewrite'),
  };
};

/** The page the app is told was asked for, as it reaches the server. */
const askedFor = (url: string, method = 'GET') =>
  proxy(new NextRequest(url, { method, headers: { host: new URL(url).host } })).headers.get(
    'x-middleware-request-x-portal-path',
  );

// Under tsx NODE_ENV is not production, so the console's scheme is http, as
// consoleEnv.adminOrigin builds it.
const consoleOrigin = 'http://admin.ubunifutech.com';

expect('the old address goes to the console', answer('https://ubunifutech.com/admin'), {
  status: 307,
  location: `${consoleOrigin}/`,
  rewrite: null,
});
expect('with a trailing slash too', answer('https://ubunifutech.com/admin/').location, `${consoleOrigin}/`);
expect(
  'a page and its query string go with it',
  answer('https://ubunifutech.com/admin/projects?status=open').location,
  `${consoleOrigin}/projects?status=open`,
);
expect('from www as well', answer('https://www.ubunifutech.com/admin/invoices').location, `${consoleOrigin}/invoices`);
expect('a HEAD request is sent on too', answer('https://ubunifutech.com/admin', 'HEAD').status, 307);
expect(
  'a doubled slash stays on the console host',
  new URL(answer('https://ubunifutech.com/admin//elsewhere.example/x').location ?? 'http://none').host,
  'admin.ubunifutech.com',
);
expect('a form post is not sent across', answer('https://ubunifutech.com/admin/projects/new', 'POST'), {
  status: 404,
  location: null,
  rewrite: null,
});
expect('a page that only starts the same is left alone', answer('https://ubunifutech.com/administration').status, 200);
expect('the public site is left alone', answer('https://ubunifutech.com/services').location, null);
expect(
  'the console host still serves the console',
  answer('https://admin.ubunifutech.com/projects').rewrite,
  'https://admin.ubunifutech.com/admin/projects',
);
expect('the console host serves no API', answer('https://admin.ubunifutech.com/api/contact').status, 404);

process.env.CONSOLE_ADMIN_ORIGIN = 'http://admin.localhost:3001';
expect(
  'a configured console origin is used, as on a laptop or a preview',
  answer('http://localhost:3001/admin/clients').location,
  'http://admin.localhost:3001/clients',
);
process.env.CONSOLE_ADMIN_ORIGIN = 'not a url';
expect('a broken console origin falls back to the 404', answer('https://ubunifutech.com/admin').status, 404);

// ── The portal's own host ────────────────────────────────────────────────────
//
// The portal moved from ubunifutech.com/portal to portal.ubunifutech.com. Every
// email already sent carries the old address, one-time sign-in links among
// them, so the old address must hand the page and its query string across.

delete process.env.CONSOLE_ADMIN_ORIGIN;
const portalOrigin = 'http://portal.ubunifutech.com';

expect('the old portal address goes to the portal', answer('https://ubunifutech.com/portal'), {
  status: 307,
  location: `${portalOrigin}/`,
  rewrite: null,
});
expect(
  'an emailed sign-in link keeps its token',
  answer('https://ubunifutech.com/portal/sign-in/verify?token=abc.def-123').location,
  `${portalOrigin}/sign-in/verify?token=abc.def-123`,
);
expect(
  'an invoice link from www goes across too',
  answer('https://www.ubunifutech.com/portal/invoices/INV-2026-001').location,
  `${portalOrigin}/invoices/INV-2026-001`,
);
expect('a form post to the old address is not sent across', answer('https://ubunifutech.com/portal/requests', 'POST'), {
  status: 404,
  location: null,
  rewrite: null,
});
expect('a page that only starts the same is left alone', answer('https://ubunifutech.com/portals').status, 200);
expect(
  'a doubled slash stays on the portal host',
  new URL(answer('https://ubunifutech.com/portal//elsewhere.example/x').location ?? 'http://none').host,
  'portal.ubunifutech.com',
);

expect(
  'the portal host serves the portal home',
  answer('https://portal.ubunifutech.com/').rewrite,
  'https://portal.ubunifutech.com/portal',
);
expect(
  'and its pages, without /portal in the address',
  answer('https://portal.ubunifutech.com/invoices/INV-2026-001?paid=1').rewrite,
  'https://portal.ubunifutech.com/portal/invoices/INV-2026-001?paid=1',
);
expect(
  'the server is told the page in its own spelling, for coming back after sign-in',
  askedFor('https://portal.ubunifutech.com/invoices/INV-2026-001?paid=1&_rsc=xyz'),
  '/portal/invoices/INV-2026-001?paid=1',
);
expect('the long spelling is shortened in the address', answer('https://portal.ubunifutech.com/portal/documents?x=1'), {
  status: 307,
  location: 'https://portal.ubunifutech.com/documents?x=1',
  rewrite: null,
});
expect(
  'a form post in the long spelling is served, not redirected',
  answer('https://portal.ubunifutech.com/portal/sign-out', 'POST'),
  { status: 200, location: null, rewrite: null },
);
expect(
  'a form post to a page is served there',
  answer('https://portal.ubunifutech.com/requests', 'POST').rewrite,
  'https://portal.ubunifutech.com/portal/requests',
);
expect('the portal host serves its own endpoints', answer('https://portal.ubunifutech.com/api/portal/assistant', 'POST'), {
  status: 200,
  location: null,
  rewrite: null,
});
expect('and no other API', answer('https://portal.ubunifutech.com/api/contact', 'POST').status, 404);
expect(
  'a page of the website followed inside the portal goes to the website',
  answer('https://portal.ubunifutech.com/build').location,
  'https://ubunifutech.com/build',
);
expect(
  'an article too',
  answer('https://portal.ubunifutech.com/blog/an-article').location,
  'https://ubunifutech.com/blog/an-article',
);
expect(
  'the console is not served on the portal host',
  answer('https://portal.ubunifutech.com/admin/projects').rewrite,
  'https://portal.ubunifutech.com/portal/admin/projects',
);
expect(
  'nor the portal on the console host',
  answer('https://admin.ubunifutech.com/portal/invoices').rewrite,
  'https://admin.ubunifutech.com/admin/portal/invoices',
);

// A form's redirect, fetched by Next on the server: addressed to the server's
// own origin, with the host the browser used only in x-forwarded-host.
const forwarded = (url: string, browserHost: string) =>
  proxy(
    new NextRequest(url, { headers: { host: new URL(url).host, 'x-forwarded-host': browserHost } }),
  ).headers.get('x-middleware-rewrite');
expect(
  'a redirect to the portal home, fetched on the server, is still the portal home',
  forwarded('http://localhost:3001/', 'portal.localhost:3001'),
  'http://localhost:3001/portal',
);
expect(
  'and one to the console home is still the console home',
  forwarded('http://localhost:3001/', 'admin.localhost:3001'),
  'http://localhost:3001/admin',
);
expect('with no forwarded host, the Host header decides', forwarded('https://ubunifutech.com/', ''), null);

expect(
  'on a laptop the old address goes to portal.localhost on the same port',
  answer('http://localhost:3001/portal/invoices').location,
  'http://portal.localhost:3001/invoices',
);
expect(
  'and portal.localhost serves the portal',
  answer('http://portal.localhost:3001/team').rewrite,
  'http://portal.localhost:3001/portal/team',
);
expect(
  'with the website on plain localhost',
  answer('http://portal.localhost:3001/contact').location,
  'http://localhost:3001/contact',
);

process.env.CONSOLE_PORTAL_ORIGIN = 'https://portal.example.test';
expect(
  'a configured portal origin is used',
  answer('https://ubunifutech.com/portal/team').location,
  'https://portal.example.test/team',
);
process.env.CONSOLE_PORTAL_ORIGIN = 'not a url';
expect('a broken portal origin falls back to the 404', answer('https://ubunifutech.com/portal').status, 404);

if (failures.length > 0) {
  console.error(`Proxy check failed:\n${failures.map((failure) => `  ${failure}`).join('\n')}`);
  process.exit(1);
}
console.log(
  'Proxy check passed: /admin and /portal on the public site are sent to the same page on their own hosts with the query string kept, a post there still 404s, the console host is unchanged, and the portal host serves the portal without /portal in the address.',
);
