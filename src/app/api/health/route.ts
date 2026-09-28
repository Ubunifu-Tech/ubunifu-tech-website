import { db } from '@/lib/db';

/**
 * For uptime monitors: 200 when the site can reach its database within three
 * seconds, 503 when it cannot. The body says only which, so it tells a
 * stranger nothing about how the site is built. The proxy answers 404 for
 * /api on the console's host, so this exists on the public host only.
 */
export const dynamic = 'force-dynamic';

const TIMEOUT_MS = 3_000;

const HEADERS = { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8' };

export async function GET(): Promise<Response> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`no answer in ${TIMEOUT_MS} ms`)), TIMEOUT_MS);
  });

  try {
    await Promise.race([db.$queryRaw`SELECT 1`, timeout]);
    return new Response('ok', { status: 200, headers: HEADERS });
  } catch (error) {
    console.error('[health] database check failed', error);
    return new Response('unavailable', { status: 503, headers: HEADERS });
  } finally {
    clearTimeout(timer);
  }
}

export const HEAD = GET;
