import 'server-only';
import type { NextRequest } from 'next/server';

/**
 * Two checks every chat endpoint makes before it does anything that costs
 * money or reads a session.
 */

/**
 * Whether a POST came from a page on the host it was sent to.
 *
 * A browser sends Origin with every cross-site POST, so another website
 * cannot use its visitors' browsers to spend our chat budget or to post as
 * someone signed in. A request with no Origin did not come from a page in a
 * browser; it is left to the rate limits, which are what stop a script.
 */
export function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  const host = request.headers.get('host');
  try {
    return Boolean(host) && new URL(origin).host.toLowerCase() === host!.toLowerCase();
  } catch {
    return false;
  }
}

export type JsonBody =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; status: 400 | 413 | 415; error: string };

/**
 * The request body as a JSON object, read with a ceiling. Without one a
 * megabyte of JSON is parsed before the message's own length is ever looked
 * at. The declared length is checked first, so an oversized body is refused
 * without being read; the text is checked again, since the header can be
 * absent or wrong.
 */
export async function readJsonBody(request: NextRequest, maxBytes: number): Promise<JsonBody> {
  const mediaType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
  if (mediaType !== 'application/json') {
    return { ok: false, status: 415, error: 'Expected a JSON request.' };
  }
  const tooLong = { ok: false, status: 413, error: 'That is too long for the chat. Try a shorter message.' } as const;
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declared) && declared > maxBytes) return tooLong;

  const raw = await request.text();
  if (Buffer.byteLength(raw, 'utf8') > maxBytes) return tooLong;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('not an object');
    return { ok: true, value: value as Record<string, unknown> };
  } catch {
    return { ok: false, status: 400, error: 'Invalid request body.' };
  }
}
