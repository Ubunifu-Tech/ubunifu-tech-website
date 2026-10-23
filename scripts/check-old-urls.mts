/**
 * Every console and portal address that something outside the page relies on
 * still opens: links in emails, Activity lines, the portal, and the bookmarks
 * and query strings staff have been using. The console is being reshaped, and
 * an address that stops working is a broken email in somebody's inbox.
 *
 *   npm run check:old-urls                       (against http://localhost:3001)
 *   npm run check:old-urls -- --baseline         (records where each one lands)
 *
 * It fills each address in with real records from the database the server
 * uses, signs in the way check-links does, and fails on an error page, a 404,
 * or a bounce to sign-in or no-access. Where an address now lands somewhere
 * different from the recorded baseline it says so, without failing: some
 * moves are the point of the change, and they are read and accepted by a
 * person.
 *
 * Only GET requests are made. Nothing is changed.
 */
process.loadEnvFile('.env');

import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const { db } = await import('../src/lib/db');
const { generateToken, hashToken } = await import('../src/lib/console/crypto');

const BASE = new URL(process.env.CHECK_BASE ?? 'http://localhost:3001');
const PUBLIC = BASE.origin;
const ADMIN = `${BASE.protocol}//admin.${BASE.hostname}${BASE.port ? `:${BASE.port}` : ''}`;
const BASELINE = new URL('../.claude/reviews/old-urls-baseline.json', import.meta.url);
const recording = process.argv.includes('--baseline');

const BROKEN_TEXT = [
  'Something went wrong',
  'Application error',
  'Unhandled Runtime Error',
  'This page could not be found',
];

/** The cookie names in src/lib/console/session.ts, which cannot be imported outside Next. */
const COOKIE = { admin: 'ubu_console_staff', portal: 'ubu_portal_client' } as const;

async function signIn(actorType: 'staff' | 'client_contact', actorId: string, audience: 'admin' | 'portal') {
  const token = generateToken();
  await db.session.create({
    data: {
      tokenHash: hashToken(token),
      actorType,
      actorId,
      audience,
      userAgent: 'check-old-urls',
      expiresAt: new Date(Date.now() + 30 * 60_000),
    },
  });
  return `${COOKIE[audience]}=${token}`;
}

const monthOf = (date: Date) => date.toISOString().slice(0, 7);

// ── The records the addresses are filled in with ─────────────────────────────

const [owner, enquiry, client, removedClient, project, document, ticket, invoice, receipt, refund, post, writer, cost, income] =
  await Promise.all([
    db.staffUser.findFirst({ where: { role: 'owner', isActive: true }, orderBy: { createdAt: 'asc' }, select: { id: true } }),
    db.enquiry.findFirst({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, select: { id: true } }),
    db.client.findFirst({ where: { deletedAt: null }, orderBy: { createdAt: 'asc' }, select: { slug: true } }),
    db.client.findFirst({ where: { deletedAt: { not: null } }, select: { slug: true } }),
    db.project.findFirst({
      where: { deletedAt: null, client: { deletedAt: null } },
      orderBy: { updatedAt: 'desc' },
      select: { slug: true },
    }),
    db.document.findFirst({ where: { project: { deletedAt: null } }, orderBy: { createdAt: 'desc' }, select: { reference: true } }),
    db.ticket.findFirst({ orderBy: { createdAt: 'desc' }, select: { reference: true } }),
    db.invoice.findFirst({ where: { status: { not: 'draft' } }, orderBy: { createdAt: 'desc' }, select: { number: true } }),
    db.receipt.findFirst({ orderBy: { createdAt: 'desc' }, select: { number: true } }),
    db.refund.findFirst({ orderBy: { createdAt: 'desc' }, select: { number: true } }),
    db.post.findFirst({ where: { deletedAt: null }, select: { id: true } }),
    db.writer.findFirst({ where: { deletedAt: null }, select: { id: true } }),
    db.cost.findFirst({ select: { incurredOn: true } }),
    db.income.findFirst({ select: { receivedOn: true } }),
  ]);

const staffUrls: string[] = [
  '/',
  '/enquiries',
  '/enquiries?show=new',
  '/clients',
  '/clients?show=portal',
  '/clients/new',
  '/projects',
  '/projects?view=list',
  '/projects?view=board',
  '/projects?show=live',
  '/projects/new',
  '/documents',
  '/documents?show=signed',
  '/requests',
  '/invoices',
  '/invoices?show=open',
  '/payments',
  '/payments?show=refunds',
  '/payments?show=reversed',
  '/payments/new',
  '/receipts',
  '/refunds',
  '/renewals',
  '/finance',
  '/finance?period=this-month',
  '/finance/costs',
  '/finance/income',
  '/removed',
  '/activity',
  '/activity?show=failures',
  '/settings',
  '/settings/team',
  '/settings/billing',
  '/settings/documents',
  '/settings/products',
  '/profile',
  '/posts',
  '/posts?show=archived',
  '/posts/images',
  '/posts/writers',
  '/no-access?need=finance',
];

if (enquiry) {
  staffUrls.push(`/enquiries/${enquiry.id}`, `/enquiries?open=${enquiry.id}`, `/enquiries?show=new&open=${enquiry.id}`);
  staffUrls.push(`/clients/new?enquiry=${enquiry.id}`);
}
if (client) {
  staffUrls.push(`/clients/${client.slug}`, `/projects/new?client=${client.slug}`, `/payments/new?client=${client.slug}`);
}
if (removedClient) staffUrls.push(`/removed/${removedClient.slug}`);
if (project) {
  staffUrls.push(`/payments/new?project=${project.slug}`);
  for (const tab of ['', '?tab=plan', '?tab=fees', '?tab=documents', '?tab=updates', '?tab=brand', '?tab=activity', '?tab=nonsense']) {
    staffUrls.push(`/projects/${project.slug}${tab}`);
  }
}
if (document) {
  staffUrls.push(`/documents/${document.reference}`, `/documents/${document.reference}/print`);
  for (const step of ['details', 'fees', 'write', 'review', 'send']) {
    staffUrls.push(`/documents/${document.reference}?step=${step}`);
  }
}
if (ticket) staffUrls.push(`/requests/${ticket.reference}`);
if (invoice) {
  staffUrls.push(`/invoices/${invoice.number}`, `/invoices/${invoice.number}/print`, `/payments/new?invoice=${invoice.number}`);
}
if (receipt) staffUrls.push(`/receipts/${receipt.number}`);
if (refund) staffUrls.push(`/refunds/${refund.number}`);
if (post) staffUrls.push(`/posts/${post.id}`);
if (writer) staffUrls.push(`/posts/writers/${writer.id}`);
if (cost) staffUrls.push(`/finance/costs?month=${monthOf(cost.incurredOn)}`);
if (income) staffUrls.push(`/finance/income?month=${monthOf(income.receivedOn)}`);

// The portal, as the first client contact who can sign in, with their own records.
const contact = await db.clientContact.findFirst({
  where: { deletedAt: null, canSignIn: true, activatedAt: { not: null }, client: { deletedAt: null } },
  orderBy: { createdAt: 'asc' },
  select: { id: true, clientId: true },
});
const portalUrls: string[] = [];
if (contact) {
  const mine = { clientId: contact.clientId };
  const [theirProject, theirDocument, theirInvoice, theirReceipt, theirRefund, theirTicket] = await Promise.all([
    db.project.findFirst({ where: { ...mine, deletedAt: null }, select: { slug: true } }),
    db.document.findFirst({ where: { project: { ...mine, deletedAt: null }, status: { not: 'draft' } }, select: { reference: true } }),
    db.invoice.findFirst({ where: { ...mine, status: { notIn: ['draft', 'void'] } }, select: { number: true } }),
    db.receipt.findFirst({ where: { payment: { invoice: mine } }, select: { number: true } }),
    db.refund.findFirst({ where: { payment: { invoice: mine } }, select: { number: true } }),
    db.ticket.findFirst({ where: mine, select: { reference: true } }),
  ]);
  portalUrls.push('/portal', '/portal/invoices', '/portal/requests', '/portal/profile', '/portal/team');
  if (theirProject) portalUrls.push(`/portal/projects/${theirProject.slug}`);
  if (theirDocument) portalUrls.push(`/portal/documents/${theirDocument.reference}`);
  if (theirInvoice) portalUrls.push(`/portal/invoices/${theirInvoice.number}`);
  if (theirReceipt) portalUrls.push(`/portal/receipts/${theirReceipt.number}`);
  if (theirRefund) portalUrls.push(`/portal/refunds/${theirRefund.number}`);
  if (theirTicket) portalUrls.push(`/portal/requests/${theirTicket.reference}`);
}

// ── Visiting them ────────────────────────────────────────────────────────────

type Visit = { url: string; landed: string; status: number; problem?: string };

async function visit(origin: string, path: string, cookie: string): Promise<Visit> {
  const response = await fetch(`${origin}${path}`, { redirect: 'follow', headers: { cookie } });
  const landedUrl = new URL(response.url);
  const landed = `${landedUrl.pathname}${landedUrl.search}`;
  const visitResult: Visit = { url: `${origin}${path}`, landed, status: response.status };
  const type = response.headers.get('content-type') ?? '';

  if (response.status >= 400) {
    visitResult.problem = `status ${response.status}`;
  } else if (/\/sign-in$/.test(landedUrl.pathname)) {
    visitResult.problem = 'sent to sign in';
  } else if (landedUrl.pathname === '/no-access' && !path.startsWith('/no-access')) {
    visitResult.problem = 'sent to no-access';
  } else if (type.includes('text/html')) {
    const shown = (await response.text()).replace(/<script[\s\S]*?<\/script>/g, '');
    const broken = BROKEN_TEXT.find((text) => shown.includes(text));
    if (broken) visitResult.problem = `shows "${broken}"`;
  } else {
    await response.body?.cancel();
  }
  return visitResult;
}

const visits: Visit[] = [];
if (owner) {
  const cookie = await signIn('staff', owner.id, 'admin');
  for (const path of staffUrls) visits.push(await visit(ADMIN, path, cookie));
} else {
  console.log('Console: skipped, no active owner in this database.');
}
if (contact) {
  const cookie = await signIn('client_contact', contact.id, 'portal');
  for (const path of portalUrls) visits.push(await visit(PUBLIC, path, cookie));
} else {
  console.log('Portal: skipped, no client with a portal account in this database.');
}

await db.$disconnect();

// ── Reporting ────────────────────────────────────────────────────────────────

const broken = visits.filter((item) => item.problem);
const landings = Object.fromEntries(visits.map((item) => [item.url, item.landed]));

if (recording) {
  writeFileSync(BASELINE, `${JSON.stringify(landings, null, 2)}\n`);
  console.log(`Baseline recorded: ${visits.length} addresses.`);
} else if (existsSync(BASELINE)) {
  const before = JSON.parse(readFileSync(BASELINE, 'utf8')) as Record<string, string>;
  const moved = visits.filter((item) => before[item.url] && before[item.url] !== item.landed);
  const fresh = visits.filter((item) => !before[item.url]);
  for (const item of moved) console.log(`  now lands elsewhere: ${item.url}\n    was ${before[item.url]}\n    now ${item.landed}`);
  if (fresh.length > 0) console.log(`  ${fresh.length} address(es) not in the baseline yet.`);
}

console.log(`${visits.length} addresses checked, ${broken.length} broken.`);
if (broken.length > 0) {
  for (const item of broken) console.error(`  ${item.problem}: ${item.url}`);
  process.exit(1);
}
