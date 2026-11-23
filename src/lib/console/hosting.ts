import 'server-only';

/**
 * The few calls the console makes to Vercel: find a project, pause it, resume
 * it. Nothing else of Vercel's API is used, and nothing here decides whether a
 * pause is allowed; that is services/hosting.ts.
 *
 * VERCEL_ACCESS_TOKEN is a token made in Vercel (Account Settings, Tokens),
 * scoped to the team that holds the client sites. VERCEL_TEAM_ID names that
 * team; leave it empty for projects on a personal account.
 */

const API = 'https://api.vercel.com';
const TIMEOUT_MS = 15_000;

export type VercelProject = { id: string; name: string; paused: boolean };

export type VercelProblem =
  | 'not_configured'
  | 'not_found'
  | 'refused'
  | 'unreachable';

export type VercelResult<Value> = { ok: true; value: Value } | { ok: false; problem: VercelProblem };

export function vercelConfigured(): boolean {
  return Boolean(process.env.VERCEL_ACCESS_TOKEN?.trim());
}

/**
 * The Vercel project this console itself runs on, when Vercel tells us. It
 * must never be linked to a client's project: pausing it would take the
 * console down, and the Resume button with it.
 */
export function ownVercelProjectId(): string | null {
  return process.env.VERCEL_PROJECT_ID?.trim() || null;
}

export const VERCEL_PROBLEM: Record<VercelProblem, string> = {
  not_configured:
    'The console has no Vercel access token yet. An owner adds VERCEL_ACCESS_TOKEN to the environment settings.',
  not_found: 'Vercel has no project with that id in our team. Check it in the project\'s settings on Vercel.',
  refused: 'Vercel refused the request. The access token may have expired or may not cover that team.',
  unreachable:
    'Vercel could not be reached, so this may not have gone through. Try again in a minute. If the site does not match what is shown here, press the button again.',
};

async function call(path: string, method: 'GET' | 'POST'): Promise<VercelResult<unknown>> {
  const token = process.env.VERCEL_ACCESS_TOKEN?.trim();
  if (!token) return { ok: false, problem: 'not_configured' };
  const url = new URL(path, API);
  const team = process.env.VERCEL_TEAM_ID?.trim();
  if (team) url.searchParams.set('teamId', team);

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return { ok: false, problem: 'unreachable' };
  }
  if (response.status === 401 || response.status === 403) return { ok: false, problem: 'refused' };
  // Vercel answers 400 as well as 404 for a project id it does not know.
  if (response.status === 404 || response.status === 400) return { ok: false, problem: 'not_found' };
  if (!response.ok) return { ok: false, problem: 'unreachable' };
  return { ok: true, value: await response.json().catch(() => null) };
}

/** A project by its id or its name, as Vercel knows it now. */
export async function findVercelProject(idOrName: string): Promise<VercelResult<VercelProject>> {
  const found = await call(`/v9/projects/${encodeURIComponent(idOrName)}`, 'GET');
  if (!found.ok) return found;
  const project = found.value as { id?: unknown; name?: unknown; paused?: unknown } | null;
  if (typeof project?.id !== 'string' || typeof project.name !== 'string') {
    return { ok: false, problem: 'unreachable' };
  }
  return { ok: true, value: { id: project.id, name: project.name, paused: project.paused === true } };
}

/**
 * Pauses or resumes a project. When Vercel refuses the call, the project is
 * read once to see whether it already stands that way: one somebody paused on
 * Vercel itself is paused, whatever the second pause call said.
 */
export async function setVercelPaused(
  projectId: string,
  paused: boolean,
): Promise<VercelResult<{ paused: boolean }>> {
  const changed = await call(
    `/v1/projects/${encodeURIComponent(projectId)}/${paused ? 'pause' : 'unpause'}`,
    'POST',
  );
  if (changed.ok) return { ok: true, value: { paused } };
  if (changed.problem === 'not_configured' || changed.problem === 'refused') return changed;

  const now = await findVercelProject(projectId);
  if (now.ok && now.value.paused === paused) return { ok: true, value: { paused } };
  return changed;
}
