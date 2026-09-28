/**
 * Where to send someone back to after they sign in. Only a portal page, never
 * the sign-in pages themselves, and never anything that could leave the site:
 * no scheme, no protocol-relative "//", no backslashes. Anything else is null,
 * and the caller falls back to the portal home.
 */
export function safePortalPath(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 300) return null;
  if (!/^\/portal(\/[A-Za-z0-9/_.~%-]*)?(\?[A-Za-z0-9=&_.~%+-]*)?$/.test(value)) return null;
  if (value.includes('//') || value.includes('\\') || value.includes('..')) return null;
  if (/^\/portal\/(sign-in|sign-out|activate)(\/|\?|$)/.test(value)) return null;
  return value;
}

/**
 * The console's version: where to send a staff member back to after they
 * sign in. A console path as the browser sees it, without the /admin prefix
 * the proxy adds, and never the sign-in pages or anything that could leave
 * the site. '+' is allowed in the query, where URLSearchParams writes a
 * space. Anything else is null, and the caller falls back to the console home.
 */
export function safeConsolePath(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 300) return null;
  if (!/^\/[A-Za-z0-9/_.~%-]*(\?[A-Za-z0-9=&_.~%+-]*)?$/.test(value)) return null;
  if (value.includes('//') || value.includes('\\') || value.includes('..')) return null;
  if (/^\/(admin|sign-in|sign-out)/.test(value)) return null;
  return value;
}
