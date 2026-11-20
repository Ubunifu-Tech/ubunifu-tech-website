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

if (failures.length > 0) {
  console.error(`Proxy check failed:\n${failures.map((failure) => `  ${failure}`).join('\n')}`);
  process.exit(1);
}
console.log(
  'Proxy check passed: /admin on the public site is sent to the same page on the console host, a post there still 404s, and the console host is unchanged.',
);
