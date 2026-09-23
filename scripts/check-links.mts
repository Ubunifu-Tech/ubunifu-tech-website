/**
 * Follows every internal link on the site, the console and the portal, and
 * fails if any of them is broken: a 404, a 500, or a page that renders the
 * error screen instead of itself.
 *
 *   npm run check:links                    (against http://localhost:3001)
 *   CHECK_BASE=http://localhost:3000 npm run check:links
 *
 * It needs a running server and the database that server uses. It signs in
 * with a short session written straight to the database: one for the first
 * active owner, and one for the first client contact who has a portal
 * account. A one-time link no longer signs anyone in on a GET (a link preview
 * would spend it), so following one would not give this script a cookie.
 *
 * Only GET requests are made, and only to links that appear on pages. Sign-in
 * and sign-out routes are never followed.
 */

process.loadEnvFile('.env');

const { db } = await import('../src/lib/db');
const { generateToken, hashToken } = await import('../src/lib/console/crypto');

const BASE = new URL(process.env.CHECK_BASE ?? 'http://localhost:3001');
const PUBLIC = BASE.origin;
const ADMIN = `${BASE.protocol}//admin.${BASE.hostname}${BASE.port ? `:${BASE.port}` : ''}`;
const MAX_PAGES = Number(process.env.CHECK_MAX_PAGES ?? 600);

/** Pages whose text means something went wrong, whatever the status said. */
const BROKEN_TEXT = [
  'Something went wrong',
  'Application error',
  'Unhandled Runtime Error',
  'This page could not be found',
];

/** Never followed: they change state or burn a link. */
const SKIP = [
  /\/sign-out(\?|$)/,
  /\/sign-in\/verify/,
  /\/portal\/sign-in\/verify/,
  /^\/_next\//,
  /\/api\//,
];

/** The cookie names in src/lib/console/session.ts, which cannot be imported outside Next. */
const COOKIE = { admin: 'ubu_console_staff', portal: 'ubu_portal_client' } as const;

/** A session that lasts long enough for one crawl, as a Cookie header. */
async function signIn(actorType: 'staff' | 'client_contact', actorId: string, audience: 'admin' | 'portal') {
  const token = generateToken();
  await db.session.create({
    data: {
      tokenHash: hashToken(token),
      actorType,
      actorId,
      audience,
      userAgent: 'check-links',
      expiresAt: new Date(Date.now() + 30 * 60_000),
    },
  });
  return `${COOKIE[audience]}=${token}`;
}

type Result = { url: string; status: number; from: string; problem?: string };

async function crawl(origin: string, seeds: string[], cookie: string | null, label: string) {
  const seen = new Set<string>();
  const queue: { path: string; from: string }[] = seeds.map((path) => ({ path, from: '(start)' }));
  const results: Result[] = [];

  while (queue.length > 0 && seen.size < MAX_PAGES) {
    const { path, from } = queue.shift()!;
    if (seen.has(path)) continue;
    seen.add(path);

    const response = await fetch(`${origin}${path}`, {
      redirect: 'follow',
      headers: cookie ? { cookie } : {},
    });
    const type = response.headers.get('content-type') ?? '';
    const result: Result = { url: `${origin}${path}`, status: response.status, from };

    if (response.status >= 400) {
      result.problem = `status ${response.status}`;
    } else if (type.includes('text/html')) {
      const html = await response.text();
      const shown = html.replace(/<script[\s\S]*?<\/script>/g, '');
      const broken = BROKEN_TEXT.find((text) => shown.includes(text));
      if (broken) result.problem = `shows "${broken}"`;

      // A redirect to sign-in means the session did not hold, which would make
      // the rest of this crawl meaningless.
      const landed = new URL(response.url);
      if (cookie && /\/sign-in$/.test(landed.pathname)) result.problem = 'sent to sign in';

      for (const match of html.matchAll(/href="([^"#]+)(#[^"]*)?"/g)) {
        const raw = match[1]!.replace(/&amp;/g, '&');
        if (!raw.startsWith('/') || raw.startsWith('//')) continue;
        if (SKIP.some((pattern) => pattern.test(raw))) continue;
        if (/\.(css|js|png|jpg|jpeg|webp|avif|svg|ico|woff2?|txt|xml|webmanifest)(\?|$)/.test(raw)) continue;
        if (!seen.has(raw)) queue.push({ path: raw, from: path });
      }
    } else {
      await response.body?.cancel();
    }

    if (result.problem) results.push(result);
  }

  console.log(`${label}: ${seen.size} pages checked, ${results.length} broken.`);
  return results;
}

const owner = await db.staffUser.findFirst({
  where: { role: 'owner', isActive: true },
  orderBy: { createdAt: 'asc' },
  select: { id: true },
});
const client = await db.clientContact.findFirst({
  where: { deletedAt: null, canSignIn: true, activatedAt: { not: null }, client: { deletedAt: null } },
  orderBy: { createdAt: 'asc' },
  select: { id: true },
});

const broken: Result[] = [];

broken.push(...(await crawl(PUBLIC, ['/', '/contact', '/blog', '/build', '/work', '/about'], null, 'Website')));

if (owner) {
  const cookie = await signIn('staff', owner.id, 'admin');
  broken.push(...(await crawl(ADMIN, ['/'], cookie, 'Console')));
} else {
  console.log('Console: skipped, no active owner in this database.');
}

if (client) {
  const cookie = await signIn('client_contact', client.id, 'portal');
  broken.push(...(await crawl(PUBLIC, ['/portal'], cookie, 'Portal')));
} else {
  console.log('Portal: skipped, no client with a portal account in this database.');
}

await db.$disconnect();

if (broken.length > 0) {
  console.error('\nBroken links:');
  for (const item of broken) console.error(`  ${item.problem}: ${item.url}  (linked from ${item.from})`);
  process.exit(1);
}
console.log('\nEvery link checked works.');
