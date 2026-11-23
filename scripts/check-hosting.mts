/**
 * Hosting links: when a client's site may be paused, and what the console
 * says to Vercel.
 *
 * Pausing takes a site offline, so the rule is checked here case by case: no
 * link, already paused, nothing overdue, overdue with no notice, a notice from
 * before the invoice fell due, a due date moved later after a notice, a paid
 * or void invoice. Then the three Vercel calls, against a stand-in for fetch:
 * the address and token each sends, and how each failure is read. Nothing
 * here touches Vercel or the database.
 *
 * Run with: npm run check:hosting
 */
import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

/**
 * `server-only` throws on import outside Next; an empty module stands in for
 * it so the server code under test can be loaded here, as in the other checks.
 */
const requireFromHere = createRequire(import.meta.url);
const serverOnly = requireFromHere.resolve('server-only');
requireFromHere.cache[serverOnly] = new (requireFromHere('node:module').Module)(serverOnly);
requireFromHere.cache[serverOnly]!.filename = serverOnly;
requireFromHere.cache[serverOnly]!.loaded = true;
requireFromHere.cache[serverOnly]!.exports = {};

const { isOverdue, noticeDayProblem, pauseStanding, standingNotice, VERCEL_PROJECT_ID } = await import(
  '../src/lib/console/hosting-rules'
);
const { findVercelProject, setVercelPaused, vercelConfigured } = await import('../src/lib/console/hosting');

const failures: string[] = [];
let count = 0;
function expect(label: string, got: unknown, want: unknown) {
  count += 1;
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    failures.push(`${label}: got ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`);
  }
}

// ── The rule ─────────────────────────────────────────────────────────────────
// Dates are stored at noon UTC, like a typed date. Today is 23 November.
const day = (value: string) => new Date(`${value}T12:00:00Z`);
const now = day('2026-11-23');
const invoice = (over: Record<string, unknown> = {}) => ({
  number: 'INV-2026-007',
  status: 'sent',
  dueAt: day('2026-11-10'),
  totalMinor: 150_000,
  paidMinor: 0,
  notices: [] as { givenAt: Date }[],
  ...over,
});
const standing = (invoices: ReturnType<typeof invoice>[], over: Record<string, unknown> = {}) =>
  pauseStanding({ linked: true, pausedAt: null, invoices, now, ...over });

expect('overdue: owed and past due', isOverdue(invoice(), now), true);
expect('overdue: due today is not late', isOverdue(invoice({ dueAt: now }), now), false);
expect('overdue: part paid still counts', isOverdue(invoice({ status: 'part_paid', paidMinor: 50_000 }), now), true);
expect('overdue: paid in full does not', isOverdue(invoice({ status: 'paid', paidMinor: 150_000 }), now), false);
expect('overdue: a draft does not', isOverdue(invoice({ status: 'draft' }), now), false);
expect('overdue: a void invoice does not', isOverdue(invoice({ status: 'void' }), now), false);
expect('overdue: no due date does not', isOverdue(invoice({ dueAt: null }), now), false);

expect('pause: no link', standing([invoice({ notices: [{ givenAt: day('2026-11-15') }] })], { linked: false }).allowed, false);
expect(
  'pause: already paused',
  standing([invoice({ notices: [{ givenAt: day('2026-11-15') }] })], { pausedAt: day('2026-11-20') }).allowed,
  false,
);
expect('pause: nothing overdue', standing([invoice({ dueAt: day('2026-12-01') })]).allowed, false);
expect('pause: no invoices at all', standing([]).allowed, false);

const noNotice = standing([invoice()]);
expect('pause: overdue with no notice', noNotice.allowed, false);
expect(
  'pause: the refusal names the invoice and where to record the notice',
  !noNotice.allowed && noNotice.reason.includes('INV-2026-007') && noNotice.reason.includes("invoice's page"),
  true,
);

expect('pause: overdue with a notice', standing([invoice({ notices: [{ givenAt: day('2026-11-15') }] })]).allowed, true);
expect(
  'pause: a notice from before the due date does not count',
  standing([invoice({ notices: [{ givenAt: day('2026-11-05') }] })]).allowed,
  false,
);
expect(
  'pause: a notice on the due date itself does not count',
  standing([invoice({ notices: [{ givenAt: day('2026-11-10') }] })]).allowed,
  false,
);
expect(
  'pause: the due date moved later after a notice, so the notice no longer counts',
  standing([invoice({ dueAt: day('2026-11-18'), notices: [{ givenAt: day('2026-11-15') }] })]).allowed,
  false,
);
expect(
  'pause: a paid invoice with a notice',
  standing([invoice({ status: 'paid', paidMinor: 150_000, notices: [{ givenAt: day('2026-11-15') }] })]).allowed,
  false,
);
expect(
  'pause: a void invoice with a notice',
  standing([invoice({ status: 'void', notices: [{ givenAt: day('2026-11-15') }] })]).allowed,
  false,
);

// Two overdue invoices: the one with a notice is the one named.
const two = standing([
  invoice({ number: 'INV-2026-003', dueAt: day('2026-10-01') }),
  invoice({ number: 'INV-2026-007', notices: [{ givenAt: day('2026-11-15') }, { givenAt: day('2026-11-20') }] }),
]);
expect('pause: names the invoice that has the notice', two.allowed && two.invoice.number, 'INV-2026-007');
expect('pause: and its latest notice', two.allowed && two.notice.givenAt.toISOString(), day('2026-11-20').toISOString());
expect('notice: none standing without a due date', standingNotice(invoice({ dueAt: null, notices: [{ givenAt: now }] })), null);

expect('notice day: the day after due is fine', noticeDayProblem(invoice(), day('2026-11-11'), now), null);
expect('notice day: today is fine', noticeDayProblem(invoice(), now, now), null);
expect('notice day: tomorrow is refused', noticeDayProblem(invoice(), day('2026-11-24'), now) !== null, true);
expect('notice day: the due date is refused', noticeDayProblem(invoice(), day('2026-11-10'), now) !== null, true);

expect('id: a Vercel id', VERCEL_PROJECT_ID.test('prj_AbC123xyz890'), true);
expect('id: a name is not an id', VERCEL_PROJECT_ID.test('client-website'), false);
expect('id: a path is not an id', VERCEL_PROJECT_ID.test('prj_abc123/../x'), false);

// The assistant has no way to do any of this. Read from the source, so the
// check needs no database: no action is named for hosting, and none of the
// assistant's code reaches the hosting service or the Vercel calls.
{
  const folder = 'src/lib/console/staff-agent';
  const files = [
    ...readdirSync(folder).map((file) => `${folder}/${file}`),
    ...readdirSync(`${folder}/actions`).map((file) => `${folder}/actions/${file}`),
  ].filter((file) => file.endsWith('.ts'));
  const sources = files.map((file) => ({ file, text: readFileSync(file, 'utf8') }));
  const names = sources.flatMap(({ text }) => [...text.matchAll(/^\s{2}name: '([a-z_]+)',$/gm)].map((match) => match[1]!));
  expect('assistant: its actions and lookups were found', names.length >= 10, true);
  expect(
    'assistant: nothing it can call pauses, resumes or links hosting',
    names.filter((name) => /host|pause|resume|vercel/.test(name)),
    [],
  );
  expect(
    'assistant: none of its code imports the hosting service or the Vercel calls',
    sources
      .filter(({ text }) => /from '@\/lib\/console\/(services\/hosting|hosting)'/.test(text))
      .map(({ file }) => file),
    [],
  );
}

// ── What is said to Vercel ───────────────────────────────────────────────────
type Call = { method: string; url: string; auth: string | null };
const realFetch = globalThis.fetch;
const realEnv = { token: process.env.VERCEL_ACCESS_TOKEN, team: process.env.VERCEL_TEAM_ID };

/** Replaces fetch for one case. Each answer is used once, in order. */
function vercel(answers: (Response | Error)[]): Call[] {
  const calls: Call[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({
      method: init?.method ?? 'GET',
      url: String(input),
      auth: new Headers(init?.headers).get('authorization'),
    });
    const answer = answers.shift() ?? new Error('unexpected call');
    if (answer instanceof Error) throw answer;
    return answer;
  }) as typeof fetch;
  return calls;
}
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const project = (paused: boolean) => ({ id: 'prj_client0001', name: 'client-website', paused });

try {
  delete process.env.VERCEL_ACCESS_TOKEN;
  delete process.env.VERCEL_TEAM_ID;
  let calls = vercel([]);
  expect('no token: not configured', vercelConfigured(), false);
  expect('no token: nothing is sent', await findVercelProject('prj_client0001'), { ok: false, problem: 'not_configured' });
  expect('no token: pause sends nothing', await setVercelPaused('prj_client0001', true), { ok: false, problem: 'not_configured' });
  expect('no token: no calls made', calls.length, 0);

  process.env.VERCEL_ACCESS_TOKEN = 'token-for-check';
  process.env.VERCEL_TEAM_ID = 'team_check';

  calls = vercel([json(200, project(false))]);
  expect('find: reads id, name and paused', await findVercelProject('client-website'), { ok: true, value: project(false) });
  expect('find: the address, with the team', calls[0]?.url, 'https://api.vercel.com/v9/projects/client-website?teamId=team_check');
  expect('find: the token as a bearer', calls[0]?.auth, 'Bearer token-for-check');

  calls = vercel([json(404, {})]);
  expect('find: unknown project', await findVercelProject('prj_nope000001'), { ok: false, problem: 'not_found' });
  calls = vercel([json(403, {})]);
  expect('find: token refused', await findVercelProject('prj_client0001'), { ok: false, problem: 'refused' });
  calls = vercel([new TypeError('fetch failed')]);
  expect('find: network down', await findVercelProject('prj_client0001'), { ok: false, problem: 'unreachable' });
  calls = vercel([json(500, {})]);
  expect('find: Vercel erroring', await findVercelProject('prj_client0001'), { ok: false, problem: 'unreachable' });
  calls = vercel([json(200, { nothing: 'useful' })]);
  expect('find: an answer with no project in it', await findVercelProject('prj_client0001'), { ok: false, problem: 'unreachable' });
  calls = vercel([json(200, {})]);
  await findVercelProject('a/b?c');
  expect('find: an odd name cannot change the path', calls[0]?.url, 'https://api.vercel.com/v9/projects/a%2Fb%3Fc?teamId=team_check');

  calls = vercel([json(200, {})]);
  expect('pause: done', await setVercelPaused('prj_client0001', true), { ok: true, value: { paused: true } });
  expect('pause: one POST to the pause address', calls.map((call) => `${call.method} ${call.url}`), [
    'POST https://api.vercel.com/v1/projects/prj_client0001/pause?teamId=team_check',
  ]);
  calls = vercel([json(200, {})]);
  expect('resume: done', await setVercelPaused('prj_client0001', false), { ok: true, value: { paused: false } });
  expect('resume: one POST to the unpause address', calls.map((call) => `${call.method} ${call.url}`), [
    'POST https://api.vercel.com/v1/projects/prj_client0001/unpause?teamId=team_check',
  ]);

  calls = vercel([json(403, {})]);
  expect('pause: token refused', await setVercelPaused('prj_client0001', true), { ok: false, problem: 'refused' });
  expect('pause: a refusal is not retried or read back', calls.length, 1);

  calls = vercel([json(400, {}), json(200, project(true))]);
  expect('pause: refused but already paused on Vercel', await setVercelPaused('prj_client0001', true), { ok: true, value: { paused: true } });
  calls = vercel([json(400, {}), json(200, project(false))]);
  expect('pause: refused and still serving', await setVercelPaused('prj_client0001', true), { ok: false, problem: 'not_found' });
  calls = vercel([new TypeError('fetch failed'), new TypeError('fetch failed')]);
  expect('pause: network down', await setVercelPaused('prj_client0001', true), { ok: false, problem: 'unreachable' });
  calls = vercel([json(500, {}), json(200, project(true))]);
  expect('resume: Vercel erroring and still paused', await setVercelPaused('prj_client0001', false), { ok: false, problem: 'unreachable' });

  delete process.env.VERCEL_TEAM_ID;
  calls = vercel([json(200, project(false))]);
  await findVercelProject('prj_client0001');
  expect('no team: no teamId in the address', calls[0]?.url, 'https://api.vercel.com/v9/projects/prj_client0001');
} finally {
  globalThis.fetch = realFetch;
  if (realEnv.token === undefined) delete process.env.VERCEL_ACCESS_TOKEN;
  else process.env.VERCEL_ACCESS_TOKEN = realEnv.token;
  if (realEnv.team === undefined) delete process.env.VERCEL_TEAM_ID;
  else process.env.VERCEL_TEAM_ID = realEnv.team;
}

if (failures.length > 0) {
  console.error(`Hosting check failed, ${failures.length} of ${count}:`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log(
  `Hosting check passed: ${count} cases. A pause needs a link, an overdue invoice and a notice given after it fell due, and Vercel is told only to find, pause or resume.`,
);
